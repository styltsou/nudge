import { describe, expect, it } from 'bun:test';
import {
  canAct,
  commentSchema,
  createSchema,
  implementationSchema,
  localUrlSchema,
  nextStatus,
} from './index';

describe('contracts and transition rules', () => {
  it('enforces every valid state transition and terminal acceptance', () => {
    expect(nextStatus('queued', 'claim')).toBe('in_progress');
    expect(nextStatus('in_progress', 'release')).toBe('queued');
    for (const status of ['queued', 'in_progress'] as const)
      expect(nextStatus(status, 'implementation')).toBe('ready_for_review');
    expect(nextStatus('ready_for_review', 'accept')).toBe('accepted');
    expect(nextStatus('ready_for_review', 'request-changes')).toBe('queued');
    expect(() => nextStatus('accepted', 'implementation')).toThrow();
    expect(() => nextStatus('queued', 'accept')).toThrow();
  });
  it('separates browser and agent authorities', () => {
    expect(canAct('browser', 'claim')).toBe(false);
    expect(canAct('mcp', 'accept')).toBe(false);
    expect(canAct('mcp', 'request-changes')).toBe(false);
    expect(canAct('browser', 'accept')).toBe(true);
  });
  it('strips credentials, query and fragment and rejects remote URLs', () => {
    expect(
      localUrlSchema.parse(
        'http://user:secret@localhost:5173/dashboard?token=secret#secret',
      ),
    ).toBe('http://localhost:5173/dashboard');
    expect(localUrlSchema.safeParse('https://example.com').success).toBe(false);
    expect(localUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
  });
  it('validates comments and display-only file paths', () => {
    expect(commentSchema.parse('  Taller chart  ')).toBe('Taller chart');
    for (const comment of ['', '  ', 'x'.repeat(2001)])
      expect(commentSchema.safeParse(comment).success).toBe(false);
    for (const path of ['../../secret', 'C:\\secret', '/etc/passwd', 'a/../b'])
      expect(
        implementationSchema.safeParse({
          summary: 'Done',
          changedFiles: [path],
        }).success,
      ).toBe(false);
    expect(createSchema.safeParse({ actor: 'human' }).success).toBe(false);
  });
});
