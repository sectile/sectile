import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argumentsWithoutSeparator = process.argv.slice(2).filter((argument) => argument !== '--');
const quiet = argumentsWithoutSeparator.includes('--quiet');
const compatibility = argumentsWithoutSeparator.includes('--compat');
const unexpected = argumentsWithoutSeparator.filter((argument) => argument !== '--quiet' && argument !== '--compat');
if (unexpected.length > 0) throw new Error(`unexpected verification arguments: ${unexpected.join(', ')}`);

const generatedOutputs = [
  join(root, 'packages', 'core', 'dist'),
  join(root, 'packages', 'core', '.verification-dist'),
  join(root, 'packages', 'dom', 'dist'),
  join(root, 'packages', 'terminal', 'dist'),
  join(root, 'packages', 'vue', 'dist'),
  join(root, 'docs', '.vitepress', 'dist'),
];

const pnpm = (...args) => Object.freeze({ command: 'pnpm', args });
const packageStep = (label, packageName, script) => Object.freeze({
  label,
  ...pnpm('--filter', packageName, script),
});

const fullSteps = [
  packageStep('core clean build', '@sectile/core', 'build'),
  packageStep('core verification', '@sectile/core', 'verify'),
  packageStep('DOM verification', '@sectile/dom', 'verify'),
  packageStep('terminal verification', '@sectile/terminal', 'verify'),
  packageStep('Vue verification', '@sectile/vue', 'verify'),
  packageStep('documentation verification', '@sectile/docs', 'verify'),
  Object.freeze({
    label: 'cross-host verification',
    command: process.execPath,
    args: [
      '--test',
      '--test-concurrency=1',
      ...readdirSync(join(root, 'verification', 'cross-host'))
        .filter((file) => file.endsWith('.test.mjs'))
        .sort()
        .map((file) => join(root, 'verification', 'cross-host', file)),
    ],
  }),
  Object.freeze({ label: 'tooling verification', ...pnpm('test:tooling') }),
  Object.freeze({ label: 'workspace boundaries', ...pnpm('check:boundaries') }),
  Object.freeze({ label: 'component completeness', ...pnpm('check:components') }),
];

const compatibilitySteps = [
  packageStep('core clean build', '@sectile/core', 'build'),
  packageStep('core runtime tests', '@sectile/core', 'test'),
  packageStep('DOM runtime tests', '@sectile/dom', 'test'),
  packageStep('terminal runtime tests', '@sectile/terminal', 'test'),
  packageStep('Vue runtime tests', '@sectile/vue', 'test'),
];

function elapsedSeconds(startedAt) {
  return ((performance.now() - startedAt) / 1_000).toFixed(1);
}

function writeFailureOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

const steps = compatibility ? compatibilitySteps : fullSteps;
console.log(`verification: ${compatibility ? 'runtime compatibility' : 'full release'} on ${process.version}`);

const cleanupStartedAt = performance.now();
if (quiet) process.stdout.write('- clean generated outputs ... ');
for (const output of generatedOutputs) rmSync(output, { recursive: true, force: true });
if (quiet) console.log(`ok (${elapsedSeconds(cleanupStartedAt)}s)`);

for (const { label, command, args } of steps) {
  const startedAt = performance.now();
  if (quiet) process.stdout.write(`- ${label} ... `);
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  if (result.error !== undefined) throw result.error;
  if (result.status !== 0) {
    if (quiet) {
      console.log(`failed (${elapsedSeconds(startedAt)}s)`);
      writeFailureOutput(result);
    }
    process.exit(result.status ?? 1);
  }
  if (quiet) console.log(`ok (${elapsedSeconds(startedAt)}s)`);
}

console.log(`verification passed: ${steps.length + 1} sequential stages`);
