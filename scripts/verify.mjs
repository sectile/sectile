import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withArtifactSession } from './lib/artifact-session.mjs';
import { boundedFailureOutput } from './lib/compact-process.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rawArguments = process.argv.slice(2).filter((argument) => argument !== '--');
const quietRequested = rawArguments.includes('--quiet');
const verbose = rawArguments.includes('--verbose');
const compatibility = rawArguments.includes('--compat');
const targetArguments = rawArguments.filter((argument) => !argument.startsWith('--'));
const unknownFlags = rawArguments.filter((argument) => (
  argument.startsWith('--')
  && argument !== '--quiet'
  && argument !== '--verbose'
  && argument !== '--compat'
));
if (unknownFlags.length > 0) throw new Error(`unexpected verification flags: ${unknownFlags.join(', ')}`);
if (quietRequested && verbose) throw new Error('verification cannot be both quiet and verbose');

const graph = await loadPublishedPackageGraph();
const aliases = new Map(graph.packages.flatMap((entry) => [
  [entry.name, entry.name],
  [entry.directory, entry.name],
  [`packages/${entry.directory}`, entry.name],
]));
aliases.set('docs', '@sectile/docs');
aliases.set('@sectile/docs', '@sectile/docs');

const explicitTargets = new Set(targetArguments.map((argument) => {
  const target = aliases.get(argument);
  if (target === undefined) {
    throw new Error(`unknown verification target: ${argument}; expected ${[...aliases.keys()].join(', ')}`);
  }
  return target;
}));
if (compatibility && explicitTargets.has('@sectile/docs')) {
  throw new Error('compatibility verification accepts published package targets only');
}

const fullVerification = explicitTargets.size === 0;
const selectedPackages = new Set(
  fullVerification
    ? graph.packages.map(({ name }) => name)
    : [...explicitTargets].filter((name) => name !== '@sectile/docs'),
);
const includeDocumentation = fullVerification || explicitTargets.has('@sectile/docs');
const dependencyClosure = collectDependencyClosure(selectedPackages, includeDocumentation);
const modeLabel = compatibility ? 'runtime compatibility' : 'release';
const targetLabel = fullVerification ? 'all packages' : [...explicitTargets].join(', ');

const packagePipelines = Object.freeze({
  '@sectile/core': [
    'typecheck', 'test', 'build', 'check:contracts', 'check:public-api',
    'check:api-stability', 'check:semantic-api', 'check:laws', 'check:naming',
    'check:layout', 'check:import-boundaries', 'check:dist-boundary',
    'check:subpaths', 'check:package', 'check:verification',
    'verify:reproducible-build',
  ],
  '@sectile/form': [
    'typecheck', 'test', 'build', 'check:laws', 'check:package',
    'check:public-api', 'verify:reproducible-build',
  ],
  '@sectile/temporal': ['typecheck', 'test', 'build', 'check:laws', 'check:package', 'verify:reproducible-build'],
  '@sectile/virtual': ['typecheck', 'test', 'build', 'check:laws', 'check:package', 'verify:reproducible-build'],
  '@sectile/tabular': [
    'typecheck', 'test', 'build', 'check:laws', 'check:package', 'check:implementation',
    'verify:reproducible-build',
  ],
  '@sectile/dom': ['typecheck', 'test', 'build', 'verify:reproducible-build'],
  '@sectile/terminal': ['typecheck', 'test', 'build', 'verify:reproducible-build'],
  '@sectile/vue': [
    'typecheck', 'typecheck:public', 'test', 'check:controlled-reconciliation',
    'check:hydration-contract', 'build', 'verify:reproducible-build',
  ],
});

const steps = compatibility ? compatibilitySteps() : releaseSteps();
const status = await withArtifactSession(
  `${modeLabel} verification (${targetLabel})`,
  () => runVerification(),
);
process.exitCode = status;

function releaseSteps() {
  const result = packageSteps((name) => packagePipelines[name]);
  if (selectedPackages.has('@sectile/tabular')) {
    result.push(packageScriptStep('Tabular raw Virtual witnesses', '@sectile/tabular', ['test:virtual:witnesses']));
  }
  if (selectedPackages.has('@sectile/form')) {
    result.push(commandStep('Form packed consumer verification', process.execPath, [
      join(root, 'verification', 'consumer-install', 'form.mjs'),
    ]));
  }
  if (includeDocumentation) {
    result.push(packageScriptStep('documentation verification', '@sectile/docs', [
      'generate:check', 'typecheck', 'test', 'build',
    ]));
  }
  if (fullVerification) result.push(...workspaceContractSteps());
  return result;
}

function compatibilitySteps() {
  const result = packageSteps(() => ['test', 'build']);
  if (selectedPackages.has('@sectile/tabular')) {
    result.push(packageScriptStep('Tabular raw Virtual witnesses', '@sectile/tabular', ['test:virtual:witnesses']));
  }
  return result;
}

function packageSteps(pipelineFor) {
  const result = [];
  for (const entry of graph.order) {
    if (!dependencyClosure.has(entry.name)) continue;
    if (selectedPackages.has(entry.name)) {
      result.push(packageScriptStep(`verify ${entry.name}`, entry.name, pipelineFor(entry.name)));
    } else {
      result.push(packageScriptStep(`prepare ${entry.name}`, entry.name, ['build']));
    }
  }
  return result;
}

function workspaceContractSteps() {
  const crossHostTests = readdirSync(join(root, 'verification', 'cross-host'))
    .filter((file) => file.endsWith('.test.mjs'))
    .sort()
    .map((file) => join(root, 'verification', 'cross-host', file));
  return [
    commandStep('cross-host verification', process.execPath, ['--test', '--test-concurrency=1', ...crossHostTests]),
    commandStep('tooling verification', 'pnpm', ['test:tooling']),
    commandStep('algorithm reuse inventory', 'pnpm', ['check:algorithm-reuse']),
    commandStep('published source maps', process.execPath, [join(root, 'scripts', 'source-map-policy.mjs'), 'check']),
    commandStep('workspace boundaries', 'pnpm', ['check:boundaries']),
    commandStep('public signatures', 'pnpm', ['check:signatures']),
    commandStep('component completeness', 'pnpm', ['check:components']),
    commandStep('Form scenario completeness', 'pnpm', ['check:form-scenarios']),
    commandStep('component public API', process.execPath, [
      join(root, 'scripts', 'check-component-public-api.mjs'),
    ]),
    commandStep('public change gates', process.execPath, [
      join(root, 'scripts', 'check-public-change-gates.mjs'), '--full',
    ]),
  ];
}

function collectDependencyClosure(targets, includeDocs) {
  const closure = new Set(includeDocs ? graph.packages.map(({ name }) => name) : []);
  const visit = (name) => {
    if (closure.has(name)) return;
    closure.add(name);
    const entry = graph.byName.get(name);
    for (const dependency of entry.dependencies) visit(dependency);
  };
  for (const target of targets) visit(target);
  return closure;
}

function packageScriptStep(label, packageName, scripts) {
  return Object.freeze({
    commands: Object.freeze(scripts.map((script) => Object.freeze({
      args: ['--filter', packageName, '--silent', 'run', script],
      command: 'pnpm',
      detail: `${packageName} ${script}`,
    }))),
    label,
  });
}

function commandStep(label, command, args) {
  return Object.freeze({
    commands: Object.freeze([Object.freeze({ args, command, detail: label })]),
    label,
  });
}

function runVerification() {
  const verificationStartedAt = performance.now();
  if (verbose) console.log(`verification: ${modeLabel} (${targetLabel}) on ${process.version}`);
  cleanGeneratedOutputs();

  for (const [index, step] of steps.entries()) {
    if (!quietRequested) console.log(`[${index + 1}/${steps.length}] ${step.label}`);
    for (const { detail, command, args } of step.commands) {
      const startedAt = performance.now();
      if (verbose) console.log(`  ${detail}`);
      const result = spawnSync(command, args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 32 * 1_024 * 1_024,
        stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      });
      if (result.error !== undefined) {
        reportFailure(detail, startedAt, result);
        throw result.error;
      }
      if (result.status !== 0) {
        reportFailure(detail, startedAt, result);
        return result.status ?? 1;
      }
    }
  }

  console.log(`verification passed: ${steps.length} stages (${elapsedSeconds(verificationStartedAt)}s)`);
  return 0;
}

function cleanGeneratedOutputs() {
  for (const entry of graph.order) {
    if (!dependencyClosure.has(entry.name)) continue;
    rmSync(join(root, 'packages', entry.directory, 'dist'), { recursive: true, force: true });
    rmSync(join(root, 'packages', entry.directory, '.verification-dist'), { recursive: true, force: true });
  }
  if (includeDocumentation) rmSync(join(root, 'docs', '.vitepress', 'dist'), { recursive: true, force: true });
}

function reportFailure(detail, startedAt, result) {
  console.error(`verification failed: ${detail} (${elapsedSeconds(startedAt)}s)`);
  if (verbose) return;
  writeFailureChannel('stdout', result.stdout);
  writeFailureChannel('stderr', result.stderr);
}

function writeFailureChannel(name, value) {
  const output = boundedFailureOutput(value);
  if (!output) return;
  process.stderr.write(`\n${name}:\n${output}${output.endsWith('\n') ? '' : '\n'}`);
}

function elapsedSeconds(startedAt) {
  return ((performance.now() - startedAt) / 1_000).toFixed(1);
}
