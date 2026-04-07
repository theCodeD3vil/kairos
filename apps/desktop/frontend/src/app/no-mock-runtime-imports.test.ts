import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = join(process.cwd(), 'src');
const forbiddenModuleFragments = [
  "@/data/mock",
  "@/components/overview/mock-data",
  "@/mocks/",
];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
      continue;
    }

    if (fullPath.endsWith('.test.ts') || fullPath.endsWith('.test.tsx')) {
      continue;
    }

    if (fullPath.includes('/src/data/mock') || fullPath.endsWith('/src/components/overview/mock-data.ts')) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

describe('dashboard runtime imports', () => {
  it('does not use mock modules as runtime values', () => {
    const violations: string[] = [];

    for (const filePath of walk(srcRoot)) {
      const file = readFileSync(filePath, 'utf8');
      const importStatements = file.matchAll(/import\s+(type\s+)?[\s\S]*?\sfrom\s+['"][^'"]+['"]\s*;?/g);

      for (const statement of importStatements) {
        const importText = statement[0];
        const targetsForbiddenModule = forbiddenModuleFragments.some((fragment) => importText.includes(fragment));
        if (!targetsForbiddenModule) {
          continue;
        }

        const isTypeOnlyImport = /^\s*import\s+type\b/.test(importText);
        if (isTypeOnlyImport) {
          continue;
        }

        const offset = statement.index ?? 0;
        const lineNumber = file.slice(0, offset).split('\n').length;
        const oneLine = importText.replace(/\s+/g, ' ').trim();
        violations.push(`${relative(srcRoot, filePath)}:${lineNumber} ${oneLine}`);
      }
    }

    expect(violations).toEqual([]);
  });
});
