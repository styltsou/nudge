import { implementationSchema } from '../../shared/src/index';
import type { RunAnswer, RunInteraction } from '../../shared/src/runs';
import { redact } from './redact';
import { JsonRpcProcess, type RpcMessage } from './jsonrpc';
import {
  instructions,
  promptFor,
  type AgentTurn,
  type Job,
  type Report,
  type Update,
} from './provider';

type Field = {
  type: string;
  title?: string;
  description?: string;
  enum?: string[];
  oneOf?: { const: string; title?: string }[];
  items?: { type: string; enum?: string[] };
};
export function parseAgentReport(text: string) {
  return implementationSchema.parse(
    JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')),
  );
}
export class AcpTurn implements AgentTurn {
  private transport: JsonRpcProcess;
  private session = '';
  private text = '';
  private settled = false;
  private resolve!: (report: Report) => void;
  private reject!: (error: Error) => void;
  private pending = new Map<
    string,
    {
      id: string | number;
      accept?: string;
      deny?: string;
      fields?: Record<string, Field>;
    }
  >();
  readonly done: Promise<Report>;
  /** Latest title the agent generated for this session, if any. */
  title?: string;
  onTitle?: (title: string) => void;
  constructor(
    executable: string,
    args: string[],
    private root: string,
    private update: Update,
    private provider = 'Agent',
    env?: Record<string, string>,
  ) {
    this.done = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
    this.transport = new JsonRpcProcess(
      executable,
      args,
      root,
      (m) => this.message(m),
      () => this.fail(),
      env,
    );
  }
  private fail() {
    if (!this.settled) {
      this.settled = true;
      this.reject(
        new Error(
          `${this.provider} stopped or returned an unsupported ACP response`,
        ),
      );
    }
  }
  async start(job: Job) {
    const hello = await this.transport.rpc('initialize', {
      protocolVersion: 1,
      clientInfo: { name: 'usenudge', version: '0.1.0' },
      clientCapabilities: { elicitation: { form: {} } },
    });
    if (hello.protocolVersion !== 1)
      throw new Error('Unsupported ACP protocol version');
    const resume = job.session.providerSessionId;
    if (
      resume &&
      !(hello.agentCapabilities as { loadSession?: boolean })?.loadSession
    )
      throw new Error('This agent does not support session loading');
    const response = await this.transport.rpc(
      resume ? 'session/load' : 'session/new',
      {
        cwd: this.root,
        mcpServers: [],
        ...(resume ? { sessionId: resume } : {}),
      },
    );
    await this.transport.drain();
    this.session = resume ?? String(response.sessionId ?? '');
    if (!this.session) throw new Error('Agent did not create a session');
    await this.update({ type: 'working', providerSessionId: this.session });
    this.text = '';
    void this.prompt(job).catch(() => this.fail());
  }
  private async prompt(job: Job) {
    const result = await this.transport.rpc(
      'session/prompt',
      {
        sessionId: this.session,
        prompt: [
          { type: 'text', text: instructions + '\n\n' + promptFor(job) },
        ],
      },
      30 * 60 * 1000,
    );
    await this.transport.drain();
    if (result.stopReason !== 'end_turn')
      throw new Error('Agent did not finish');
    const report = parseAgentReport(this.text);
    report.summary = redact(report.summary);
    this.settled = true;
    this.resolve(report);
  }
  private async message(m: RpcMessage) {
    const p = m.params ?? {};
    if (m.id !== undefined && m.method) {
      const id = String(m.id);
      let interaction: RunInteraction;
      if (m.method === 'session/request_permission') {
        const options = p.options as { optionId: string; kind: string }[];
        const accept = options?.find((o) => o.kind === 'allow_once')?.optionId;
        const deny = options?.find((o) => o.kind === 'reject_once')?.optionId;
        const details = JSON.stringify(p.toolCall);
        if (!accept || !deny || !details || details.length > 5000)
          throw new Error('Unsupported permission details');
        this.pending.set(id, { id: m.id, accept, deny });
        interaction = {
          id,
          kind: 'approval',
          text: redact('Allow this action once?\n' + details),
        };
      } else if (m.method === 'elicitation/create' && p.mode === 'form') {
        const schema = p.requestedSchema as {
          type: string;
          properties: Record<string, Field>;
          required?: string[];
        };
        if (
          schema?.type !== 'object' ||
          !schema.properties ||
          Object.keys(schema.properties).length > 10
        )
          throw new Error('Unsupported question form');
        const fields = Object.fromEntries(
          Object.entries(schema.properties).filter(
            ([key]) => !key.endsWith('_custom'),
          ),
        );
        if (
          Object.values(fields).some(
            (f) =>
              !['string', 'boolean', 'number', 'integer', 'array'].includes(
                f.type,
              ) ||
              (f.type === 'array' && f.items?.type !== 'string'),
          )
        )
          throw new Error('Unsupported question field');
        this.pending.set(id, { id: m.id, fields });
        interaction = {
          id,
          kind: 'question',
          text: redact(
            String(p.message ?? `${this.provider} needs your input`),
          ).slice(0, 6000),
          questions: Object.entries(fields).map(([key, f]) => ({
            id: key,
            text: redact(
              `${f.title ?? key}: ${f.description ?? ''}\n${(f.enum ?? f.oneOf?.map((o) => o.const) ?? f.items?.enum ?? []).join(', ')}${f.type === 'array' ? ' (comma-separated)' : ''}`,
            ).slice(0, 2000),
          })),
        };
      } else {
        this.transport.send({
          id: m.id,
          error: {
            code: -32601,
            message: 'Unsupported request denied by Nudge',
          },
        });
        throw new Error('Unsupported request');
      }
      await this.update({ type: 'interaction', interaction });
      return;
    }
    if (m.method !== 'session/update') return;
    const update = p.update as {
      sessionUpdate?: string;
      content?: { type: string; text?: string };
      kind?: string;
      title?: string | null;
      _meta?: Record<string, unknown>;
    };
    if (!update || update._meta?.['opencode/child-session']) return;
    if (
      update.sessionUpdate === 'agent_message_chunk' &&
      update.content?.type === 'text'
    ) {
      this.text += update.content.text ?? '';
      if (this.text.length > 64000) throw new Error('Agent output too large');
    }
    if (
      update.sessionUpdate === 'session_info_update' &&
      typeof update.title === 'string' &&
      update.title.trim()
    ) {
      this.title = update.title;
      this.onTitle?.(update.title);
    }
    if (update.sessionUpdate === 'tool_call') {
      this.text = '';
      await this.update({
        type: 'working',
        activity:
          update.kind === 'edit'
            ? 'Editing files'
            : update.kind === 'execute'
              ? 'Running a command'
              : 'Thinking',
      });
    }
  }
  answer(answer: RunAnswer) {
    const request = this.pending.get(answer.interactionId);
    if (!request) throw new Error('Question no longer pending');
    let result: Record<string, unknown>;
    if (request.fields) {
      const content: Record<string, unknown> = {};
      for (const [key, field] of Object.entries(request.fields)) {
        const raw = answer.answers?.[key] ?? '';
        let value: unknown = raw;
        if (field.type === 'boolean') {
          if (!['true', 'false'].includes(raw))
            throw new Error('Expected true or false');
          value = raw === 'true';
        }
        if (['number', 'integer'].includes(field.type)) {
          value = Number(raw);
          if (
            !raw.trim() ||
            !Number.isFinite(value) ||
            (field.type === 'integer' && !Number.isInteger(value))
          )
            throw new Error('Expected a number');
        }
        if (field.type === 'array') value = raw.split(',').map((v) => v.trim());
        const choices =
          field.enum ?? field.oneOf?.map((o) => o.const) ?? field.items?.enum;
        if (
          choices &&
          (Array.isArray(value) ? value : [value]).some(
            (v) => !choices.includes(String(v)),
          )
        )
          throw new Error('Answer must match one of the offered options');
        content[key] = value;
      }
      result = { action: 'accept', content };
    } else
      result = {
        outcome: {
          outcome: 'selected',
          optionId:
            answer.decision === 'accept' ? request.accept : request.deny,
        },
      };
    this.transport.send({ id: request.id, result });
    this.pending.delete(answer.interactionId);
  }
  async stop() {
    if (this.session)
      this.transport.send({
        method: 'session/cancel',
        params: { sessionId: this.session },
      });
    await this.transport.stop();
  }
  close() {
    this.transport.close();
  }
}
