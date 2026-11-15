import { z } from 'zod';
import type { AnnotationStatus } from './state-machine';
export { canAct, nextStatus } from './state-machine';
export type { AnnotationStatus, Action, Authority } from './state-machine';

export const statusSchema = z.enum([
  'queued',
  'in_progress',
  'ready_for_review',
  'accepted',
]);
export const commentSchema = z.string().trim().min(1).max(2000);
export const idSchema = z.uuid();
export const versionSchema = z.number().int().positive();
const hasControlCharacters = (value: string) =>
  Array.from(value).some((character) => character.charCodeAt(0) < 32);
export const localUrlSchema = z
  .string()
  .max(2048)
  .transform((value, ctx) => {
    try {
      const url = new URL(value);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      )
        throw new Error();
      url.username = '';
      url.password = '';
      url.search = '';
      url.hash = '';
      return url.href;
    } catch {
      ctx.addIssue({ code: 'custom', message: 'Expected a local HTTP URL' });
      return z.NEVER;
    }
  });
export const anchorSchema = z.strictObject({
  pageUrl: localUrlSchema,
  pathname: z
    .string()
    .max(1024)
    .startsWith('/')
    .refine((v) => !/[?#]/.test(v) && !hasControlCharacters(v)),
  selector: z.string().min(1).max(512).nullable(),
  testId: z.string().max(160).optional(),
  tagName: z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{0,63}$/),
  role: z.string().max(80).optional(),
  textPreview: z.string().max(160).optional(),
  rect: z.strictObject({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().min(0).max(100000),
    height: z.number().min(0).max(100000),
  }),
  viewport: z.strictObject({
    width: z.number().positive().max(100000),
    height: z.number().positive().max(100000),
  }),
  devicePixelRatio: z.number().positive().max(10).optional(),
});
export type ElementAnchor = z.infer<typeof anchorSchema>;
export const snapshotSchema = z.strictObject({
  id: idSchema,
  kind: z.enum(['before', 'after']),
  capturedAt: z.iso.datetime(),
  mimeType: z.enum(['image/png', 'image/jpeg']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  integrity: z.enum(['captured', 'manual', 'anchor-uncertain']).optional(),
});
export const implementationSchema = z.strictObject({
  summary: z.string().trim().min(1).max(4000),
  changedFiles: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(240)
        .refine(
          (p) =>
            !/^(?:[a-z]:|[/\\])|(?:^|[/\\])\.\.(?:[/\\]|$)/i.test(p) &&
            !hasControlCharacters(p),
          'Expected a relative display path',
        ),
    )
    .max(100)
    .optional(),
  commitSha: z
    .string()
    .regex(/^[a-f0-9]{7,64}$/i)
    .optional(),
});
export const revisionSchema = z.strictObject({
  id: idSchema,
  annotationId: idSchema,
  ordinal: z.number().int().positive(),
  comment: commentSchema,
  createdAt: z.iso.datetime(),
  implementation: implementationSchema
    .extend({ reportedAt: z.iso.datetime() })
    .optional(),
  beforeSnapshot: snapshotSchema.optional(),
  afterSnapshot: snapshotSchema.optional(),
});
export const annotationSchema = z.strictObject({
  id: idSchema,
  projectId: idSchema,
  anchor: anchorSchema,
  status: statusSchema,
  version: versionSchema,
  revisions: z.array(revisionSchema).min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  /** Hidden from the list, page and agent queue; reversible. */
  archivedAt: z.iso.datetime().optional(),
});
export type Annotation = z.infer<typeof annotationSchema>;
export type SnapshotRef = z.infer<typeof snapshotSchema>;
export const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
export const MAX_SNAPSHOT_DIMENSION = 2048;
export const snapshotUploadSchema = z.strictObject({
  expectedVersion: versionSchema,
  revisionId: idSchema,
  kind: z.enum(['before', 'after']),
  integrity: z.enum(['captured', 'manual']),
  dataUrl: z
    .string()
    .max(Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 22)
    .startsWith('data:image/png;base64,'),
});
export type SnapshotUpload = z.infer<typeof snapshotUploadSchema>;
export const createSchema = z.strictObject({
  comment: commentSchema,
  anchor: anchorSchema,
});
export const expectedSchema = z.strictObject({
  expectedVersion: versionSchema,
});
export const reportSchema = implementationSchema.extend({
  expectedVersion: versionSchema,
});
export const reviseSchema = expectedSchema.extend({ comment: commentSchema });
export const archiveSchema = expectedSchema.extend({ archived: z.boolean() });
export const statusLabels: Record<AnnotationStatus, string> = {
  queued: 'Queued for agent',
  in_progress: 'Agent working',
  ready_for_review: 'Ready for review',
  accepted: 'Accepted',
};
