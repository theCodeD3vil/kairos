import fs from 'node:fs/promises';
import path from 'node:path';

import initSqlJs from 'sql.js/dist/sql-asm.js';
import type { SqlJsDatabase, SqlJsStatic } from 'sql.js';

import { latestSchemaVersion, listMigrations } from './schema';
import type { OpenOutboxStorageOptions, StorageMigrationStatus } from './types';

type SqlValue = string | number | null;
type SqlParams = SqlValue[];
type SqlRow = Record<string, string | number | null>;

const MIGRATIONS_TABLE = 'schema_migrations';
let sqlStatic: SqlJsStatic | null = null;

export class OutboxDatabase {
  private readonly dbPath: string;
  private readonly db: SqlJsDatabase;

  private constructor(dbPath: string, db: SqlJsDatabase) {
    this.dbPath = dbPath;
    this.db = db;
  }

  static async open(options: OpenOutboxStorageOptions): Promise<OutboxDatabase> {
    const SQL = await loadSqlStatic();
    const dbPath = path.resolve(options.databasePath);
    await fs.mkdir(path.dirname(dbPath), { recursive: true });

    let dbBytes: Uint8Array | undefined;
    try {
      const raw = await fs.readFile(dbPath);
      dbBytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
    } catch (error) {
      if (!isNotFound(error)) {
        throw new Error(`read outbox database file: ${formatError(error)}`);
      }
    }

    const db = dbBytes ? new SQL.Database(dbBytes) : new SQL.Database();
    const outboxDB = new OutboxDatabase(dbPath, db);
    await outboxDB.runMigrations();
    return outboxDB;
  }

  query(sql: string, params: SqlParams = []): SqlRow[] {
    const statement = this.db.prepare(sql, params);
    try {
      const rows: SqlRow[] = [];
      while (statement.step()) {
        rows.push(statement.getAsObject());
      }
      return rows;
    } finally {
      statement.free();
    }
  }

  execute(sql: string, params: SqlParams = []): void {
    this.db.run(sql, params);
  }

  rowsModified(): number {
    return this.db.getRowsModified();
  }

  async withTransaction<T>(fn: () => T): Promise<T> {
    this.execute('BEGIN IMMEDIATE TRANSACTION');
    try {
      const value = fn();
      this.execute('COMMIT');
      await this.persist();
      return value;
    } catch (error) {
      try {
        this.execute('ROLLBACK');
      } catch {
        // Ignore rollback errors.
      }
      throw error;
    }
  }

  async persist(): Promise<void> {
    const bytes = this.db.export();
    const tempPath = `${this.dbPath}.tmp`;
    await fs.writeFile(tempPath, Buffer.from(bytes));
    await fs.rename(tempPath, this.dbPath);
  }

  async close(): Promise<void> {
    this.db.close();
  }

  async migrationStatus(): Promise<StorageMigrationStatus> {
    const rows = this.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`);
    const appliedVersions = rows.map((row) => toNumber(row.version, 'version'));
    return {
      currentVersion: appliedVersions.length > 0 ? appliedVersions[appliedVersions.length - 1] : 0,
      appliedVersions,
    };
  }

  private async runMigrations(): Promise<void> {
    this.execute(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);

    const status = await this.migrationStatus();
    const latest = latestSchemaVersion();
    if (status.currentVersion > latest) {
      throw new Error(
        `outbox database schema version ${status.currentVersion} is newer than supported version ${latest}`,
      );
    }

    const pending = listMigrations().filter((migration) => migration.version > status.currentVersion);
    if (pending.length === 0) {
      return;
    }

    await this.withTransaction(() => {
      for (const migration of pending) {
        for (const statement of migration.statements) {
          this.execute(statement);
        }
        this.execute(
          `INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, ?)`,
          [migration.version, new Date().toISOString()],
        );
      }
    });
  }
}

async function loadSqlStatic(): Promise<SqlJsStatic> {
  if (sqlStatic) {
    return sqlStatic;
  }

  sqlStatic = await initSqlJs();
  return sqlStatic;
}

function toNumber(value: string | number | null, field: string): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  throw new Error(`invalid numeric value for ${field}`);
}

function isNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return 'code' in error && (error as { code?: string }).code === 'ENOENT';
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
