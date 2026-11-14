import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { openDatabase } from '../../packages/bridge/src/database.ts';
import { Database } from 'bun:sqlite';

test('schema v1 upgrades preserve annotations, and future schemas fail closed', () => {
  mkdirSync('.nudge', { recursive: true });
  const root = mkdtempSync(resolve('.nudge/migration-test-'));
  const filename = resolve(root, 'data.sqlite');
  let db = new Database(filename);
  try {
    db.exec(
      "CREATE TABLE annotations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, document TEXT NOT NULL); INSERT INTO annotations VALUES ('existing', 'project', '{}'); PRAGMA user_version = 1;",
    );
    db.close(true);
    db = openDatabase(filename);
    assert.deepEqual(db.query('SELECT id FROM annotations').get(), {
      id: 'existing',
    });
    assert.deepEqual(db.query('PRAGMA user_version').get(), {
      user_version: 2,
    });
    assert.deepEqual(
      db.query('SELECT COUNT(*) AS count FROM snapshots').get(),
      { count: 0 },
    );
    db.exec('PRAGMA user_version = 3');
    db.close(true);
    assert.throws(
      () => openDatabase(filename),
      /Unsupported Nudge database schema/,
    );
  } finally {
    db.close(true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('Bun SQLite initializes the existing schema and persists data across reopening', () => {
  mkdirSync('.nudge', { recursive: true });
  const root = mkdtempSync(resolve('.nudge/sqlite-test-'));
  let db = openDatabase(resolve(root, 'data.sqlite'));
  try {
    assert.deepEqual(db.query('PRAGMA user_version').get(), {
      user_version: 2,
    });
    assert.deepEqual(db.query('PRAGMA journal_mode').get(), {
      journal_mode: 'wal',
    });
    db.query('INSERT INTO annotations VALUES (?, ?, ?)').run(
      'annotation',
      'project',
      '{"version":1}',
    );
    db.close(true);
    db = openDatabase(resolve(root, 'data.sqlite'));
    assert.deepEqual(
      db
        .query(
          'SELECT document FROM annotations WHERE id = ? AND project_id = ?',
        )
        .get('annotation', 'project'),
      { document: '{"version":1}' },
    );
  } finally {
    db.close(true);
    rmSync(root, { recursive: true, force: true });
  }
});

test('Bun SQLite immediate transactions roll back failed state changes', () => {
  const db = openDatabase(':memory:');
  try {
    db.query('INSERT INTO annotations VALUES (?, ?, ?)').run(
      'annotation',
      'project',
      '{"version":1}',
    );
    assert.throws(
      () =>
        db
          .transaction(() => {
            db.query('UPDATE annotations SET document = ? WHERE id = ?').run(
              '{"version":2}',
              'annotation',
            );
            throw new Error('Rejected state change');
          })
          .immediate(),
      /Rejected state change/,
    );
    assert.deepEqual(
      db
        .query('SELECT document FROM annotations WHERE id = ?')
        .get('annotation'),
      { document: '{"version":1}' },
    );
    db.transaction(() =>
      db
        .query('UPDATE annotations SET document = ? WHERE id = ?')
        .run('{"version":2}', 'annotation'),
    ).immediate();
    assert.deepEqual(
      db
        .query('SELECT document FROM annotations WHERE id = ?')
        .get('annotation'),
      { document: '{"version":2}' },
    );
  } finally {
    db.close(true);
  }
});
