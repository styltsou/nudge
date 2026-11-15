import type { Database } from 'bun:sqlite';
import { openDatabase } from './database';
import { randomUUID } from 'node:crypto';
import { annotationSchema, nextStatus } from '@usenudge/shared';
import type { Action, Annotation } from '@usenudge/shared';
import type { z } from 'zod';
import {
  createSchema,
  reportSchema,
  reviseSchema,
  snapshotSchema,
} from '@usenudge/shared';
import type { SnapshotRef, SnapshotUpload } from '@usenudge/shared';

export class RepositoryError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export class Repository {
  readonly db: Database;
  constructor(
    filename: string,
    private projectId: string,
  ) {
    this.db = openDatabase(filename);
  }
  close() {
    this.db.close(true);
  }
  list(status?: string): Annotation[] {
    const rows = this.db
      .query(
        'SELECT document FROM annotations WHERE project_id = ? ORDER BY rowid DESC',
      )
      .all(this.projectId) as { document: string }[];
    return rows
      .map((row) => annotationSchema.parse(JSON.parse(row.document)))
      .filter((a) => !status || a.status === status);
  }
  get(id: string): Annotation {
    const row = this.db
      .query('SELECT document FROM annotations WHERE id = ? AND project_id = ?')
      .get(id, this.projectId) as { document: string } | null;
    if (!row)
      throw new RepositoryError(404, 'NOT_FOUND', 'Annotation not found');
    return annotationSchema.parse(JSON.parse(row.document));
  }
  private save(annotation: Annotation) {
    const validated = annotationSchema.parse(annotation);
    this.db
      .query(
        'INSERT INTO annotations (id, project_id, document) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET document = excluded.document',
      )
      .run(validated.id, this.projectId, JSON.stringify(validated));
    return validated;
  }
  create(input: z.infer<typeof createSchema>): Annotation {
    const id = randomUUID();
    const now = new Date().toISOString();
    return this.save({
      id,
      projectId: this.projectId,
      anchor: input.anchor,
      status: 'queued',
      version: 1,
      createdAt: now,
      updatedAt: now,
      revisions: [
        {
          id: randomUUID(),
          annotationId: id,
          ordinal: 1,
          comment: input.comment,
          createdAt: now,
        },
      ],
    });
  }
  getSnapshot(id: string): SnapshotRef {
    const row = this.db
      .query('SELECT metadata FROM snapshots WHERE id = ? AND project_id = ?')
      .get(id, this.projectId) as { metadata: string } | null;
    if (!row) throw new RepositoryError(404, 'NOT_FOUND', 'Snapshot not found');
    return snapshotSchema.parse(JSON.parse(row.metadata));
  }
  attachSnapshot(
    id: string,
    input: SnapshotUpload,
    snapshot: SnapshotRef,
    write: () => void,
  ): Annotation {
    return this.db
      .transaction(() => {
        const a = this.get(id);
        const revision = a.revisions.at(-1)!;
        if (
          a.version !== input.expectedVersion ||
          revision.id !== input.revisionId
        )
          throw new RepositoryError(
            409,
            'STALE_VERSION',
            'Revision changed. Refresh and retry.',
          );
        if (
          (snapshot.kind === 'before' && a.status !== 'queued') ||
          (snapshot.kind === 'after' && a.status !== 'ready_for_review')
        )
          throw new RepositoryError(
            409,
            'INVALID_TRANSITION',
            'Capture is unavailable in this state',
          );
        const field =
          snapshot.kind === 'before' ? 'beforeSnapshot' : 'afterSnapshot';
        if (revision[field])
          throw new RepositoryError(
            409,
            'ALREADY_CAPTURED',
            'This revision already has this evidence',
          );
        write();
        this.db
          .query('INSERT INTO snapshots VALUES (?, ?, ?, ?, ?)')
          .run(
            snapshot.id,
            this.projectId,
            a.id,
            revision.id,
            JSON.stringify(snapshot),
          );
        revision[field] = snapshot;
        a.version++;
        a.updatedAt = new Date().toISOString();
        return this.save(a);
      })
      .immediate();
  }
  transition(
    id: string,
    action: Action,
    input: { expectedVersion: number; comment?: string } & Partial<
      z.infer<typeof reportSchema>
    >,
  ): Annotation {
    return this.db
      .transaction(() => {
        const a = this.get(id);
        if (a.version !== input.expectedVersion)
          throw new RepositoryError(
            409,
            'STALE_VERSION',
            'Annotation changed. Refresh and retry.',
          );
        try {
          a.status = nextStatus(a.status, action);
        } catch {
          throw new RepositoryError(
            409,
            'INVALID_TRANSITION',
            'Action is unavailable in this state',
          );
        }
        const now = new Date().toISOString();
        const latest = a.revisions.at(-1)!;
        if (action === 'implementation') {
          const { expectedVersion: _version, ...implementation } =
            reportSchema.parse(input);
          latest.implementation = { ...implementation, reportedAt: now };
        }
        if (action === 'request-changes') {
          const { comment } = reviseSchema.parse(input);
          a.revisions.push({
            id: randomUUID(),
            annotationId: id,
            ordinal: latest.ordinal + 1,
            comment,
            createdAt: now,
          });
        }
        a.version++;
        a.updatedAt = now;
        return this.save(a);
      })
      .immediate();
  }
}
