// build.mjs
import esbuild from 'esbuild';
import { readFileSync } from 'fs';

// Read the package.json file and parse it manually
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const { dependencies } = packageJson;

await esbuild.build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  external: Object.keys(dependencies || {}), // Use || {} as a safeguard
}).catch(() => process.exit(1));

console.log('✅ Build finished successfully!');