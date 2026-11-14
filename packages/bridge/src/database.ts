import { Database } from 'bun:sqlite';

export function openDatabase(filename: string): Database {
  const db = new Database(filename);
  try {
    const version = (
      db.query('PRAGMA user_version').get() as { user_version: number }
    ).user_version;
    if (version > 2)
      throw new Error(
        'Unsupported Nudge database schema. Update Nudge before opening this state.',
      );
    db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    if (version < 2)
      db.transaction(() =>
        db.exec(
          'CREATE TABLE IF NOT EXISTS annotations (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, document TEXT NOT NULL); CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, project_id TEXT NOT NULL, annotation_id TEXT NOT NULL, revision_id TEXT NOT NULL, metadata TEXT NOT NULL); PRAGMA user_version = 2;',
        ),
      ).immediate();
    return db;
  } catch (error) {
    db.close(true);
    throw error;
  }
}
