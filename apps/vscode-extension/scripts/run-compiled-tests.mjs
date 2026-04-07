import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const TEST_ROOT = path.join(process.cwd(), '.test-dist', 'test');

function collectCompiledTests(dir, acc) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectCompiledTests(fullPath, acc);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.test.js')) {
      acc.push(fullPath);
    }
  }
}

const files = [];
try {
  collectCompiledTests(TEST_ROOT, files);
} catch (error) {
  console.error(`failed to read compiled tests in ${TEST_ROOT}:`, error);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`no compiled test files found in ${TEST_ROOT}`);
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
