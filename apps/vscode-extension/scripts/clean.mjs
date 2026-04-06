import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

for (const relativePath of ['dist', '.test-dist']) {
  rmSync(resolve(relativePath), { force: true, recursive: true });
}
