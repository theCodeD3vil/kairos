"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxDatabase = void 0;
const promises_1 = __importDefault(require("node:fs/promises"));
const node_path_1 = __importDefault(require("node:path"));
const sql_asm_js_1 = __importDefault(require("sql.js/dist/sql-asm.js"));
const schema_1 = require("./schema");
const MIGRATIONS_TABLE = 'schema_migrations';
let sqlStatic = null;
class OutboxDatabase {
    dbPath;
    db;
    constructor(dbPath, db) {
        this.dbPath = dbPath;
        this.db = db;
    }
    static async open(options) {
        const SQL = await loadSqlStatic();
        const dbPath = node_path_1.default.resolve(options.databasePath);
        await promises_1.default.mkdir(node_path_1.default.dirname(dbPath), { recursive: true });
        let dbBytes;
        try {
            const raw = await promises_1.default.readFile(dbPath);
            dbBytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        }
        catch (error) {
            if (!isNotFound(error)) {
                throw new Error(`read outbox database file: ${formatError(error)}`);
            }
        }
        const db = dbBytes ? new SQL.Database(dbBytes) : new SQL.Database();
        const outboxDB = new OutboxDatabase(dbPath, db);
        await outboxDB.runMigrations();
        return outboxDB;
    }
    query(sql, params = []) {
        const statement = this.db.prepare(sql, params);
        try {
            const rows = [];
            while (statement.step()) {
                rows.push(statement.getAsObject());
            }
            return rows;
        }
        finally {
            statement.free();
        }
    }
    execute(sql, params = []) {
        this.db.run(sql, params);
    }
    rowsModified() {
        return this.db.getRowsModified();
    }
    async withTransaction(fn) {
        this.execute('BEGIN IMMEDIATE TRANSACTION');
        try {
            const value = fn();
            this.execute('COMMIT');
            await this.persist();
            return value;
        }
        catch (error) {
            try {
                this.execute('ROLLBACK');
            }
            catch {
                // Ignore rollback errors.
            }
            throw error;
        }
    }
    async persist() {
        const bytes = this.db.export();
        const tempPath = `${this.dbPath}.tmp`;
        await promises_1.default.writeFile(tempPath, Buffer.from(bytes));
        await promises_1.default.rename(tempPath, this.dbPath);
    }
    async close() {
        this.db.close();
    }
    async migrationStatus() {
        const rows = this.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version ASC`);
        const appliedVersions = rows.map((row) => toNumber(row.version, 'version'));
        return {
            currentVersion: appliedVersions.length > 0 ? appliedVersions[appliedVersions.length - 1] : 0,
            appliedVersions,
        };
    }
    async runMigrations() {
        this.execute(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      )
    `);
        const status = await this.migrationStatus();
        const latest = (0, schema_1.latestSchemaVersion)();
        if (status.currentVersion > latest) {
            throw new Error(`outbox database schema version ${status.currentVersion} is newer than supported version ${latest}`);
        }
        const pending = (0, schema_1.listMigrations)().filter((migration) => migration.version > status.currentVersion);
        if (pending.length === 0) {
            return;
        }
        await this.withTransaction(() => {
            for (const migration of pending) {
                for (const statement of migration.statements) {
                    this.execute(statement);
                }
                this.execute(`INSERT INTO ${MIGRATIONS_TABLE} (version, applied_at) VALUES (?, ?)`, [migration.version, new Date().toISOString()]);
            }
        });
    }
}
exports.OutboxDatabase = OutboxDatabase;
async function loadSqlStatic() {
    if (sqlStatic) {
        return sqlStatic;
    }
    sqlStatic = await (0, sql_asm_js_1.default)();
    return sqlStatic;
}
function toNumber(value, field) {
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
function isNotFound(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    return 'code' in error && error.code === 'ENOENT';
}
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=database.js.map