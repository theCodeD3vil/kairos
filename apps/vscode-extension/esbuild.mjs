import { build, context } from 'esbuild';

const watch = process.argv.includes('--watch');
const release = process.argv.includes('--release');

const config = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node20',
  outfile: 'dist/extension.js',
  sourcemap: release ? false : true,
  minify: release,
  external: ['vscode'],
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(config);
  await ctx.watch();
  console.log('Watching Kairos VS Code extension...');
} else {
  await build(config);
}
