import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: 'dist/extension.js',
  sourcemap: true,
  external: ['vscode'],
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('Watching extension scaffold...');
} else {
  await build(config);
}
