import path from 'node:path';

import type { OutboxPathOptions } from './types';
import { OUTBOX_DATABASE_FILE_NAME } from './types';

export function resolveOutboxDatabasePath(options: OutboxPathOptions): string {
  const fileName = options.fileName ?? OUTBOX_DATABASE_FILE_NAME;
  return path.join(options.context.globalStorageUri.fsPath, fileName);
}
