import Fastify from 'fastify';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { renameSync, writeFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import {
  canAct,
  createSchema,
  expectedSchema,
  idSchema,
  reportSchema,
  reviseSchema,
  statusSchema,
  snapshotUploadSchema,
  MAX_SNAPSHOT_BYTES,
} from '@usenudge/shared';
import type { Action, Annotation, Authority } from '@usenudge/shared';
import type { BridgeConfig } from './config';
import { Repository, RepositoryError } from './repository';
import { SnapshotStore, validatePng } from './snapshots';
import { RunStore } from './runs';
import {
  activeRun,
  dispatchSchema,
  answerSchema,
  runUpdateSchema,
  readinessSchema,
  providerRequestSchema,
  agentsReportSchema,
  setupUpdateSchema,
  sessionTitleSchema,
  cleanSessionTitle,
  safeSignInUrl,
  type AgentReport,
  type SetupTask,
  type Readiness,
} from '../../shared/src/runs';

function matches(actual: string, expected: string) {
  return (
    actual.length === expected.length &&
    timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}
export function createBridge(config: BridgeConfig) {
  const app = Fastify({
    logger: false,
    bodyLimit: 32 * 1024,
    requestTimeout: 15000,
    routerOptions: { maxParamLength: 64 },
  });
  const repo = new Repository(
    resolve(config.stateDir, 'data.sqlite'),
    config.projectId,
  );
  const snapshots = new SnapshotStore(config.stateDir);
  const runs = new RunStore(repo, config.projectId, config.provider);
  const recovery = setInterval(() => {
    runs.recover();
    notifyRuns();
  }, 5000);
  const authorities = new WeakMap<object, Authority>();
  const clients = new Set<ServerResponse>();
  let readiness: Readiness | undefined;
  let agents: AgentReport[] | undefined;
  let setup: SetupTask | undefined;
  let windowStart = Date.now();
  let requestCount = 0;
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RepositoryError)
      return reply
        .code(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    const status = (error as { statusCode?: number }).statusCode;
    return reply
      .code(status && status >= 400 && status < 500 ? status : 500)
      .send({
        error: {
          code: 'REQUEST_FAILED',
          message:
            status === 413
              ? 'Request is too large'
              : 'Unable to process request',
        },
      });
  });
  app.setNotFoundHandler((_request, reply) =>
    reply
      .code(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    const host = request.headers.host ?? '';
    if (!/^(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/.test(host))
      return reply.code(403).send({
        error: { code: 'HOST_DENIED', message: 'Local host required' },
      });
    const origin = request.headers.origin;
    if (origin && !config.origins.includes(origin))
      return reply.code(403).send({
        error: { code: 'ORIGIN_DENIED', message: 'Origin is not allowed' },
      });
    if (origin) {
      reply
        .header('Access-Control-Allow-Origin', origin)
        .header('Vary', 'Origin');
      reply.header(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type',
      );
      reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (request.method === 'OPTIONS') {
      if (!origin)
        return reply.code(403).send({
          error: {
            code: 'ORIGIN_REQUIRED',
            message: 'Local origin required',
          },
        });
      return reply.code(204).send();
    }
    if (request.url === '/health' && request.method === 'GET') return;
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      requestCount = 0;
    }
    if (++requestCount > 600)
      return reply.code(429).send({
        error: {
          code: 'RATE_LIMIT',
          message: 'Too many requests. Retry shortly.',
        },
      });
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (
      config.runnerToken &&
      /^[a-f0-9]{64}$/.test(token) &&
      matches(token, config.runnerToken)
    ) {
      if (
        origin ||
        !request.url.startsWith('/api/v1/runner/') ||
        // Setup/status routes work before an agent is enabled; runs need managed mode.
        (!config.managed &&
          !/^\/api\/v1\/runner\/(?:agents|setup\/(?:claim|update))$/.test(
            request.url,
          ))
      )
        return reply.code(403).send({
          error: { code: 'SCOPE_DENIED', message: 'Runner channel required' },
        });
      return;
    }
    if (request.url.startsWith('/api/v1/runner/'))
      return reply.code(403).send({
        error: {
          code: 'SCOPE_DENIED',
          message: 'Runner capability required',
        },
      });
    let authority: Authority | undefined;
    if (/^[a-f0-9]{64}$/.test(token)) {
      if (matches(token, config.browserToken)) authority = 'browser';
      if (matches(token, config.mcpToken)) authority = 'mcp';
    }
    if (!authority)
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Bridge credentials required',
        },
      });
    if ((authority === 'browser' && !origin) || (authority === 'mcp' && origin))
      return reply.code(403).send({
        error: {
          code: 'CHANNEL_DENIED',
          message: 'Credential is not valid for this channel',
        },
      });
    authorities.set(request, authority);
  });
  function publish(annotation: Annotation, event: string) {
    const data = JSON.stringify({
      annotationId: annotation.id,
      projectId: annotation.projectId,
      version: annotation.version,
      status: annotation.status,
    });
    for (const client of clients) {
      if (!client.write(`event: ${event}\ndata: ${data}\n\n`)) client.destroy();
    }
  }
  app.get('/health', async () => ({ ok: true, service: 'Nudge' }));
  const notifyRuns = () => {
    for (const c of clients) c.write('event: annotation.runs\ndata: {}\n\n');
  };
  app.get('/api/v1/managed', async (_request, _reply) => ({
    ...runs.publicState(!!config.managed),
    setupCommand: config.setupCommand ?? 'bunx --bun usenudge',
    ...(readiness ? { readiness } : {}),
    ...(agents ? { agents } : {}),
    ...(setup ? { setup } : {}),
  }));
  const setupBusy = () =>
    setup !== undefined &&
    ['pending', 'running'].includes(setup.state) &&
    Date.now() - Date.parse(setup.updatedAt) < 10 * 60 * 1000;
  const newSetup = (
    provider: SetupTask['provider'],
    kind: SetupTask['kind'],
  ) => {
    setup = {
      id: randomUUID(),
      provider,
      kind,
      state: 'pending',
      updatedAt: new Date().toISOString(),
    };
    notifyRuns();
  };
  app.post('/api/v1/agents/select', async (request, reply) => {
    if (authorities.get(request) !== 'browser')
      return reply.code(403).send({ error: { message: 'Browser required' } });
    const input = providerRequestSchema.safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: { message: 'Invalid agent' } });
    if (runs.runs().some((r) => activeRun(r)))
      return reply.code(409).send({
        error: {
          code: 'RUN_CONFLICT',
          message:
            'Stop or finish the running request before switching agents.',
        },
      });
    if (setupBusy())
      return reply.code(409).send({
        error: {
          code: 'RUN_CONFLICT',
          message: 'Wait for the current agent setup step to finish.',
        },
      });
    // Persist first; the runner reads this file, so a failed write changes nothing.
    const file = resolve(config.stateDir, 'agent.json');
    writeFileSync(
      file + '.tmp',
      JSON.stringify({
        provider: input.data.provider,
        mode: 'managed',
        transport: 'acp',
      }) + '\n',
      { mode: 0o600 },
    );
    renameSync(file + '.tmp', file);
    config.provider = input.data.provider;
    config.managed = true;
    runs.setProvider(input.data.provider);
    readiness = undefined;
    newSetup(input.data.provider, 'install');
    return { ok: true };
  });
  app.post('/api/v1/agents/login', async (request, reply) => {
    if (authorities.get(request) !== 'browser')
      return reply.code(403).send({ error: { message: 'Browser required' } });
    const input = providerRequestSchema.safeParse(request.body);
    if (!input.success || input.data.provider === 'opencode')
      return reply.code(400).send({
        error: { message: 'Sign-in from Nudge supports Codex and Claude.' },
      });
    if (setupBusy())
      return reply.code(409).send({
        error: {
          code: 'RUN_CONFLICT',
          message: 'Wait for the current agent setup step to finish.',
        },
      });
    newSetup(input.data.provider, 'login');
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>(
    '/api/v1/runner/sessions/:id/title',
    async (request, reply) => {
      const input = sessionTitleSchema.safeParse(request.body);
      const title = input.success ? cleanSessionTitle(input.data.title) : '';
      if (!title || !idSchema.safeParse(request.params.id).success)
        return reply.code(400).send({ error: { message: 'Invalid title' } });
      runs.setTitle(request.params.id, title);
      notifyRuns();
      return { ok: true };
    },
  );
  app.post('/api/v1/runner/agents', async (request, reply) => {
    const input = agentsReportSchema.safeParse(request.body);
    if (!input.success)
      return reply.code(400).send({ error: { message: 'Invalid agents' } });
    agents = input.data.agents;
    notifyRuns();
    return { ok: true };
  });
  app.post('/api/v1/runner/setup/claim', async () => {
    if (setup?.state !== 'pending') return null;
    setup = { ...setup, state: 'running', updatedAt: new Date().toISOString() };
    notifyRuns();
    return setup;
  });
  app.post('/api/v1/runner/setup/update', async (request, reply) => {
    const input = setupUpdateSchema.safeParse(request.body);
    if (!input.success || !setup || setup.id !== input.data.id)
      return reply.code(400).send({ error: { message: 'Invalid update' } });
    const { id: _id, message, url, state } = input.data;
    setup = {
      id: setup.id,
      provider: setup.provider,
      kind: setup.kind,
      state,
      updatedAt: new Date().toISOString(),
      ...(message ? { message } : {}),
      ...(url && safeSignInUrl(url) ? { url: safeSignInUrl(url)! } : {}),
    };
    notifyRuns();
    return { ok: true };
  });
  app.post('/api/v1/runner/readiness', async (request, reply) => {
    const input = readinessSchema.safeParse(request.body);
    if (!input.success || input.data.provider !== (config.provider ?? 'codex'))
      return reply
        .code(400)
        .send({ error: { message: 'Invalid readiness state' } });
    readiness = input.data;
    notifyRuns();
    return { ok: true };
  });
  app.post('/api/v1/runs', async (request, reply) => {
    if (!config.managed || authorities.get(request) !== 'browser')
      return reply
        .code(403)
        .send({ error: { message: 'Managed browser mode required' } });
    const input = dispatchSchema.safeParse(request.body);
    if (!input.success)
      return reply
        .code(400)
        .send({ error: { message: 'Invalid run request' } });
    const run = runs.dispatch(input.data);
    notifyRuns();
    return { id: run.id };
  });
  for (const action of ['stop', 'answer'] as const)
    app.post<{ Params: { id: string } }>(
      `/api/v1/runs/:id/${action}`,
      async (request, reply) => {
        if (authorities.get(request) !== 'browser')
          return reply
            .code(403)
            .send({ error: { message: 'Browser required' } });
        if (action === 'stop') runs.stop(request.params.id);
        else {
          const input = answerSchema.safeParse(request.body);
          if (!input.success)
            return reply
              .code(400)
              .send({ error: { message: 'Invalid answer' } });
          runs.answer(request.params.id, input.data);
        }
        notifyRuns();
        return { ok: true };
      },
    );
  app.post('/api/v1/runner/claim', async () => {
    const job = runs.claim();
    if (job) notifyRuns();
    return job;
  });
  app.post<{ Params: { id: string } }>(
    '/api/v1/runner/:id/update',
    async (request, reply) => {
      const input = runUpdateSchema.safeParse(request.body);
      if (!input.success)
        return reply
          .code(400)
          .send({ error: { message: 'Invalid runner event' } });
      const result = runs.update(request.params.id, input.data);
      if (input.data.type !== 'heartbeat' || result.answer) notifyRuns();
      return result;
    },
  );
  app.get('/api/v1/annotations', async (request, reply) => {
    const query = request.query as { status?: string };
    if (
      query.status !== undefined &&
      !statusSchema.safeParse(query.status).success
    )
      return reply
        .code(400)
        .send({ error: { code: 'INVALID_INPUT', message: 'Invalid status' } });
    return repo.list(query.status);
  });
  app.post('/api/v1/annotations', async (request, reply) => {
    if (authorities.get(request) !== 'browser')
      return reply.code(403).send({
        error: {
          code: 'SCOPE_DENIED',
          message: 'Browser capability required',
        },
      });
    const input = createSchema.safeParse(request.body);
    if (
      !input.success ||
      !config.origins.includes(new URL(input.data.anchor.pageUrl).origin) ||
      new URL(input.data.anchor.pageUrl).pathname !== input.data.anchor.pathname
    )
      return reply.code(400).send({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid comment or local element anchor',
        },
      });
    const annotation = repo.create(input.data);
    publish(annotation, 'annotation.created');
    return reply.code(201).send(annotation);
  });
  app.get<{ Params: { id: string } }>(
    '/api/v1/annotations/:id',
    async (request, reply) => {
      if (!idSchema.safeParse(request.params.id).success)
        return reply.code(400).send({
          error: { code: 'INVALID_ID', message: 'Invalid annotation ID' },
        });
      return repo.get(request.params.id);
    },
  );
  for (const action of [
    'claim',
    'release',
    'implementation',
    'accept',
    'request-changes',
  ] as const satisfies readonly Action[]) {
    app.post<{ Params: { id: string } }>(
      `/api/v1/annotations/:id/${action}`,
      async (request, reply) => {
        const authority = authorities.get(request);
        if (
          runs
            .runs()
            .some((r) => r.annotationId === request.params.id && activeRun(r))
        )
          throw new RepositoryError(
            409,
            'MANAGED_RUN_ACTIVE',
            'Stop or finish the managed run before changing this annotation.',
          );
        if (!authority || !canAct(authority, action))
          return reply.code(403).send({
            error: {
              code: 'SCOPE_DENIED',
              message: 'Credential cannot perform this action',
            },
          });
        const input = (
          action === 'implementation'
            ? reportSchema
            : action === 'request-changes'
              ? reviseSchema
              : expectedSchema
        ).safeParse(request.body);
        if (!idSchema.safeParse(request.params.id).success || !input.success)
          return reply.code(400).send({
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid action payload',
            },
          });
        const annotation = repo.transition(
          request.params.id,
          action,
          input.data,
        );
        publish(
          annotation,
          action === 'implementation'
            ? 'annotation.review_ready'
            : action === 'accept'
              ? 'annotation.accepted'
              : 'annotation.updated',
        );
        return annotation;
      },
    );
  }
  app.get('/api/v1/events', async (request, reply) => {
    if (clients.size >= 16)
      return reply.code(429).send({
        error: {
          code: 'SUBSCRIPTION_LIMIT',
          message: 'Too many event subscribers',
        },
      });
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(request.headers.origin
        ? {
            'Access-Control-Allow-Origin': request.headers.origin,
            Vary: 'Origin',
          }
        : {}),
    });
    clients.add(reply.raw);
    reply.raw.write(': connected; refetch current state\n\n');
    const heartbeat = setInterval(
      () => reply.raw.write(': heartbeat\n\n'),
      15000,
    );
    reply.raw.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(reply.raw);
    });
  });
  app.post<{ Params: { id: string } }>(
    '/api/v1/annotations/:id/snapshots',
    { bodyLimit: Math.ceil(MAX_SNAPSHOT_BYTES / 3) * 4 + 2048 },
    async (request, reply) => {
      if (authorities.get(request) !== 'browser')
        return reply.code(403).send({
          error: {
            code: 'SCOPE_DENIED',
            message: 'Browser capability required',
          },
        });
      const input = snapshotUploadSchema.safeParse(request.body);
      if (!input.success || !idSchema.safeParse(request.params.id).success)
        return reply.code(400).send({
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid snapshot payload',
          },
        });
      const image = validatePng(input.data.dataUrl);
      const ref = {
        id: randomUUID(),
        kind: input.data.kind,
        capturedAt: new Date().toISOString(),
        mimeType: 'image/png' as const,
        width: image.width,
        height: image.height,
        integrity: input.data.integrity,
      };
      let written = false;
      try {
        const annotation = repo.attachSnapshot(
          request.params.id,
          input.data,
          ref,
          () => {
            snapshots.write(ref.id, image.bytes);
            written = true;
          },
        );
        publish(annotation, 'annotation.updated');
        return reply.code(201).send(annotation);
      } catch (error) {
        if (written) snapshots.remove(ref.id);
        throw error;
      }
    },
  );
  app.get<{ Params: { id: string } }>(
    '/api/v1/snapshots/:id',
    async (request, reply) => {
      if (!idSchema.safeParse(request.params.id).success)
        return reply.code(400).send({
          error: { code: 'INVALID_ID', message: 'Invalid snapshot ID' },
        });
      const ref = repo.getSnapshot(request.params.id);
      reply
        .header('Content-Type', ref.mimeType)
        .header('Content-Security-Policy', "default-src 'none'; sandbox");
      return snapshots.read(ref.id);
    },
  );
  app.addHook('preClose', async () => {
    for (const client of clients) client.end();
  });
  app.addHook('onClose', async () => {
    clearInterval(recovery);
    repo.close();
  });
  return app;
}
