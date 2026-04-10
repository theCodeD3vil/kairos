declare module 'sql.js' {
  export interface SqlJsConfig {
    locateFile?: (file: string) => string;
  }

  export interface SqlJsQueryResult {
    columns: string[];
    values: Array<Array<string | number | null>>;
  }

  export interface SqlJsStatement {
    bind(values?: Array<string | number | null>): void;
    step(): boolean;
    getAsObject(): Record<string, string | number | null>;
    free(): boolean;
  }

  export interface SqlJsDatabase {
    run(sql: string, params?: Array<string | number | null>): void;
    exec(sql: string, params?: Array<string | number | null>): SqlJsQueryResult[];
    prepare(sql: string, params?: Array<string | number | null>): SqlJsStatement;
    export(): Uint8Array;
    close(): void;
    getRowsModified(): number;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array) => SqlJsDatabase;
  }

  export default function initSqlJs(config?: SqlJsConfig): Promise<SqlJsStatic>;
}

declare module 'sql.js/dist/sql-asm.js' {
  import initSqlJs from 'sql.js';

  export default initSqlJs;
}
