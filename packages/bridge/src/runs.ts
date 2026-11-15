import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import {
  activeRun,
  type AgentRun,
  type AgentSession,
  type dispatchSchema,
  type RunAnswer,
  type runUpdateSchema,
  type Provider,
} from '../../shared/src/runs';
import { Repository, RepositoryError } from './repository';

const fail = (message: string): never => {
  throw new RepositoryError(409, 'RUN_CONFLICT', message);
};
export class RunStore {
  private seen = 0;
  private recoveryUntil = 0;
  constructor(
    private repo: Repository,
    private project: string,
    private provider: Provider = 'codex',
  ) {
    repo.db.exec(
      'CREATE TABLE IF NOT EXISTS agent_records (id TEXT PRIMARY KEY, project TEXT NOT NULL, kind TEXT NOT NULL, document TEXT NOT NULL)',
    );
    this.recover(true);
  }
  private list<T>(kind: string): T[] {
    return (
      this.repo.db
        .query(
          'SELECT document FROM agent_records WHERE project = ? AND kind = ? ORDER BY rowid',
        )
        .all(this.project, kind) as { document: string }[]
    ).map((r) => JSON.parse(r.document));
  }
  private save<T extends { id: string }>(kind: string, record: T): T {
    this.repo.db
      .query(
        'INSERT INTO agent_records VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET document = excluded.document',
      )
      .run(record.id, this.project, kind, JSON.stringify(record));
    return record;
  }
  runs() {
    return this.list<AgentRun>('run');
  }
  sessions() {
    return this.list<AgentSession>('session');
  }
  get(id: string) {
    return (
      this.runs().find((r) => r.id === id) ??
      fail('Run not found in this project.')
    );
  }
  /** Replace a session's placeholder title with the one its agent generated. */
  setTitle(sessionId: string, title: string) {
    const session =
      this.sessions().find((s) => s.id === sessionId) ??
      fail('Session not found in this project.');
    session.title = title;
    session.titled = true;
    this.save('session', session);
  }
  setProvider(provider: Provider) {
    this.provider = provider;
  }
  online() {
    return Date.now() - this.seen < 10000;
  }
  publicState(enabled: boolean) {
    return {
      enabled,
      provider: this.provider,
      online: this.online(),
      runs: this.runs().map(
        ({ lease: _lease, answer: _answer, ...run }) => run,
      ),
      sessions: this.sessions().map(({ providerSessionId: _id, ...s }) => s),
    };
  }
  private event(run: AgentRun, text: string) {
    run.updatedAt = new Date().toISOString();
    run.events = [...run.events, { at: run.updatedAt, text }].slice(-30);
  }
  dispatch(input: z.infer<typeof dispatchSchema>) {
    return this.repo.db
      .transaction(() => {
        const old = this.runs().find((r) => r.requestId === input.requestId);
        if (old) {
          if (
            old.annotationId !== input.annotationId ||
            old.revisionId !== input.revisionId ||
            (input.sessionId
              ? old.sessionId !== input.sessionId
              : old.sessionMode !== 'new')
          )
            fail('Submission ID already used.');
          return old;
        }
        if (!this.online())
          fail('Runner offline. Restart your dev server after agent setup.');
        if (Date.now() < this.recoveryUntil)
          fail(
            'Previous runner is shutting down. Wait a few seconds, inspect existing edits, then retry.',
          );
        const a = this.repo.get(input.annotationId);
        if (
          a.status !== 'queued' ||
          a.revisions.at(-1)!.id !== input.revisionId
        )
          fail('This revision is not available for a run.');
        if (this.runs().some((r) => activeRun(r)))
          fail(
            'Another request is running in this project. Stop it or wait before starting this one.',
          );
        let session = input.sessionId
          ? this.sessions().find((s) => s.id === input.sessionId)
          : undefined;
        if (
          input.sessionId &&
          (!session ||
            !session.providerSessionId ||
            session.provider !== this.provider)
        )
          fail(
            'Selected session is missing or cannot be resumed. Choose a new session explicitly.',
          );
        const now = new Date().toISOString();
        session ??= this.save<AgentSession>('session', {
          id: randomUUID(),
          provider: this.provider,
          title: a.revisions.at(-1)!.comment.slice(0, 80),
          updatedAt: now,
        });
        return this.save<AgentRun>('run', {
          id: randomUUID(),
          requestId: input.requestId,
          annotationId: a.id,
          revisionId: input.revisionId,
          sessionId: session.id,
          sessionMode: input.sessionId ? 'existing' : 'new',
          status: 'queued',
          createdAt: now,
          updatedAt: now,
          events: [{ at: now, text: 'Waiting for runner' }],
        });
      })
      .immediate();
  }
  claim() {
    this.seen = Date.now();
    return this.repo.db
      .transaction(() => {
        if (this.runs().some((r) => activeRun(r) && r.status !== 'queued'))
          return null;
        const run = this.runs().find((r) => r.status === 'queued');
        if (!run) return null;
        const a = this.repo.get(run.annotationId);
        if (
          a.status !== 'queued' ||
          a.revisions.at(-1)!.id !== run.revisionId
        ) {
          run.status = 'interrupted';
          this.save('run', run);
          return null;
        }
        this.repo.transition(a.id, 'claim', { expectedVersion: a.version });
        run.status = 'starting';
        run.lease = randomUUID();
        this.event(run, `Starting ${this.provider}`);
        this.save('run', run);
        return {
          run,
          annotation: a,
          session: this.sessions().find((s) => s.id === run.sessionId)!,
        };
      })
      .immediate();
  }
  stop(id: string) {
    const run = this.get(id);
    if (!activeRun(run)) return run;
    run.status = run.status === 'queued' ? 'cancelled' : 'stopping';
    this.event(run, 'Stop requested. Existing edits are not undone.');
    return this.save('run', run);
  }
  answer(id: string, answer: RunAnswer) {
    const run = this.get(id);
    if (
      run.status !== 'waiting' ||
      run.interaction?.id !== answer.interactionId ||
      run.answer
    )
      fail('This question is no longer pending.');
    if (
      run.interaction!.kind === 'approval'
        ? !answer.decision
        : !run.interaction!.questions?.every((q) =>
            answer.answers?.[q.id]?.trim(),
          )
    )
      fail('Provide an answer for every question.');
    run.answer = answer;
    return this.save('run', run);
  }
  update(id: string, input: z.infer<typeof runUpdateSchema>) {
    return this.repo.db
      .transaction(() => {
        const run = this.get(id);
        if (!run.lease || run.lease !== input.lease || !activeRun(run))
          fail('Run lease is no longer valid.');
        this.seen = Date.now();
        const answer = run.answer;
        if (input.type === 'heartbeat') {
          // Keep unanswered prompts durable; acknowledge an answer exactly once to this runner.
          if (answer) {
            delete run.answer;
            delete run.interaction;
            if (run.status !== 'stopping') run.status = 'working';
          }
          run.updatedAt = new Date().toISOString();
          this.save('run', run);
          return { stop: run.status === 'stopping', answer };
        }
        if (
          run.status === 'stopping' &&
          input.type !== 'cancelled' &&
          input.type !== 'failed'
        )
          fail('Run is stopping.');
        if (input.providerSessionId) {
          const session = this.sessions().find((s) => s.id === run.sessionId)!;
          if (
            session.providerSessionId &&
            session.providerSessionId !== input.providerSessionId
          )
            fail('Provider session changed unexpectedly.');
          session.providerSessionId = input.providerSessionId;
          session.updatedAt = new Date().toISOString();
          this.save('session', session);
        }
        if (input.type === 'working' && !run.interaction) {
          run.status = 'working';
          this.event(run, input.activity ?? 'Thinking');
        }
        if (input.type === 'interaction') {
          if (!input.interaction || run.interaction)
            fail('Invalid or overlapping agent question.');
          run.status = 'waiting';
          run.interaction = input.interaction!;
          this.event(run, 'Waiting for your response');
        }
        if (['completed', 'failed', 'cancelled'].includes(input.type)) {
          const a = this.repo.get(run.annotationId);
          if (
            a.revisions.at(-1)!.id !== run.revisionId ||
            a.status !== 'in_progress'
          )
            fail('Annotation revision changed during the run.');
          if (input.type === 'completed' && !input.report)
            fail('An implementation report is required.');
          this.repo.transition(
            a.id,
            input.type === 'completed' ? 'implementation' : 'release',
            { expectedVersion: a.version, ...input.report },
          );
          run.status = input.type as 'completed' | 'failed' | 'cancelled';
          delete run.interaction;
          delete run.answer;
          this.event(
            run,
            input.type === 'completed'
              ? 'Agent reported completion. Review the result.'
              : input.type === 'cancelled'
                ? 'Stopped. Existing edits are not undone.'
                : 'Agent failed. Check agent sign-in/configuration and retry.',
          );
        }
        this.save('run', run);
        return { stop: false };
      })
      .immediate();
  }
  recover(startup = false) {
    for (const run of this.runs())
      if (
        activeRun(run) &&
        (startup || Date.now() - Date.parse(run.updatedAt) > 30000)
      ) {
        run.status = 'interrupted';
        this.recoveryUntil = Date.now() + 10000;
        delete run.interaction;
        delete run.answer;
        this.event(
          run,
          'Runner interrupted. Inspect existing edits before retrying.',
        );
        const a = this.repo.get(run.annotationId);
        if (
          a.status === 'in_progress' &&
          a.revisions.at(-1)!.id === run.revisionId
        )
          this.repo.transition(a.id, 'release', { expectedVersion: a.version });
        this.save('run', run);
      }
  }
}
