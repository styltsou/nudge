import { z } from 'zod';
import { idSchema, implementationSchema } from './index';
export const providers = ['codex', 'claude', 'opencode'] as const;
export type Provider = (typeof providers)[number];
export const readinessSchema = z.strictObject({
  provider: z.enum(providers),
  adapter: z.enum(['available', 'missing', 'invalid']),
  auth: z.enum(['signed-in', 'login-required', 'unknown']),
  billing: z.enum(['subscription', 'api', 'unknown']),
  checkedAt: z.iso.datetime(),
});
export type Readiness = z.infer<typeof readinessSchema>;
export const dispatchSchema = z.strictObject({
  annotationId: idSchema,
  revisionId: idSchema,
  requestId: idSchema,
  sessionId: idSchema.optional(),
});
export const interactionSchema = z.strictObject({
  id: z.string().max(100),
  kind: z.enum(['approval', 'question']),
  text: z.string().max(6000),
  questions: z
    .array(
      z.strictObject({ id: z.string().max(100), text: z.string().max(2000) }),
    )
    .max(10)
    .optional(),
});
export const answerSchema = z.strictObject({
  interactionId: z.string().max(100),
  decision: z.enum(['accept', 'decline']).optional(),
  answers: z.record(z.string().max(100), z.string().max(2000)).optional(),
});
export const runUpdateSchema = z.strictObject({
  lease: idSchema,
  type: z.enum([
    'heartbeat',
    'working',
    'interaction',
    'completed',
    'failed',
    'cancelled',
  ]),
  providerSessionId: z.string().min(1).max(200).optional(),
  activity: z
    .enum([
      'Thinking',
      'Running a command',
      'Editing files',
      'Checking results',
    ])
    .optional(),
  interaction: interactionSchema.optional(),
  report: implementationSchema.optional(),
});
export type RunInteraction = z.infer<typeof interactionSchema>;
export type RunAnswer = z.infer<typeof answerSchema>;
export type AgentSession = {
  id: string;
  provider: Provider;
  title: string;
  updatedAt: string;
  providerSessionId?: string;
};
export type AgentRun = {
  id: string;
  requestId: string;
  annotationId: string;
  revisionId: string;
  sessionId: string;
  sessionMode: 'new' | 'existing';
  status:
    | 'queued'
    | 'starting'
    | 'working'
    | 'waiting'
    | 'stopping'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'interrupted';
  createdAt: string;
  updatedAt: string;
  events: { at: string; text: string }[];
  interaction?: RunInteraction;
  answer?: RunAnswer;
  lease?: string;
};
export const activeRun = (r: AgentRun) =>
  ['queued', 'starting', 'working', 'waiting', 'stopping'].includes(r.status);
export type ManagedState = {
  setupCommand?: string;
  readiness?: Readiness;
  provider?: Provider;
  enabled: boolean;
  online: boolean;
  runs: AgentRun[];
  sessions: AgentSession[];
};
