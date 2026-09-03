import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { withArtifactSession } from './lib/artifact-session.mjs';
import { boundedFailureOutput } from './lib/compact-process.mjs';
import { execFilePortable, spawnSyncPortable } from './lib/portable-process.mjs';
import {
  collectDependencyClosure,
  deriveAffectedSelection,
} from './lib/verification-plan.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';
import { runVerificationSteps } from './lib/verification-runner.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicationPackDirectory = join(root, '.tasks', 'verification', 'publication-packs');
const formConsumerPackages = Object.freeze(['core', 'form', 'temporal', 'dom', 'terminal', 'vue']);
const rawArguments = process.argv.slice(2).filter((argument) => argument !== '--');
const quietRequested = rawArguments.includes('--quiet');
const verbose = rawArguments.includes('--verbose');
const compatibility = rawArguments.includes('--compat');
const fullRequested = rawArguments.includes('--full');
const releaseRequested = rawArguments.includes('--release');
const explainRequested = rawArguments.includes('--explain');
const continueOnFailure = rawArguments.includes('--continue');
const exactRequested = rawArguments.includes('--exact');
const targetArguments = rawArguments.filter((argument) => !argument.startsWith('--'));
const knownFlags = new Set(['--quiet', '--verbose', '--compat', '--full', '--release', '--explain', '--continue', '--exact']);
const unknownFlags = rawArguments.filter((argument) => argument.startsWith('--') && !knownFlags.has(argument));
if (unknownFlags.length > 0) throw new Error(`unexpected verification flags: ${unknownFlags.join(', ')}`);
if (quietRequested && verbose) throw new Error('verification cannot be both quiet and verbose');
if (fullRequested && releaseRequested) throw new Error('verification cannot be both full and release certification');
if (compatibility && (fullRequested || releaseRequested)) {
  throw new Error('compatibility verification cannot be combined with full or release certification');
}
if ((fullRequested || releaseRequested) && targetArguments.length > 0) {
  throw new Error('full and release verification do not accept package targets');
}
if (exactRequested && targetArguments.length === 0) {
  throw new Error('--exact requires at least one package target');
}

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

const fullRepositoryVerification = fullRequested || releaseRequested;
const changedFiles = !fullRepositoryVerification && !compatibility ? collectChangedFiles() : [];
const scopedChangedFiles = explicitTargets.size === 0
  ? changedFiles
  : changedFiles.filter((path) => fileMatchesExplicitTargets(path));
const affectedSelection = exactRequested || scopedChangedFiles.length === 0
  ? null
  : deriveAffectedSelection(graph, scopedChangedFiles);
const explicitPackages = [...explicitTargets].filter((name) => name !== '@sectile/docs');
const selectedPackages = new Set(
  compatibility
    ? explicitTargets.size === 0
      ? graph.packages.map(({ name }) => name)
      : explicitPackages
    : fullRepositoryVerification
      ? graph.packages.map(({ name }) => name)
      : explicitTargets.size > 0
        ? [...explicitPackages, ...(affectedSelection?.selectedPackages ?? [])]
        : affectedSelection?.selectedPackages ?? [],
);
const includeDocumentation = compatibility
  ? false
  : fullRepositoryVerification
    || explicitTargets.has('@sectile/docs')
    || affectedSelection?.includeDocumentation === true;
const buildDocumentationSite = includeDocumentation && (releaseRequested || !fullRepositoryVerification);
const workspaceGates = new Set(exactRequested ? [] : affectedSelection?.workspaceGates ?? []);
const dependencyClosure = collectDependencyClosure(selectedPackagesGraph(), selectedPackages, includeDocumentation);
const modeLabel = compatibility
  ? 'runtime compatibility'
  : releaseRequested
    ? 'release certification'
    : fullRequested
      ? 'full deterministic'
      : 'affected';
const targetLabel = fullRepositoryVerification || (compatibility && explicitTargets.size === 0)
  ? 'all packages'
  : explicitTargets.size > 0
    ? [...explicitTargets].join(', ')
    : selectedPackages.size > 0 || includeDocumentation
      ? [...selectedPackages, ...(includeDocumentation ? ['@sectile/docs'] : [])].join(', ')
      : 'no affected targets';

const packagePipelines = Object.freeze({
  '@sectile/core': [
    'test', 'build', 'check:contracts', 'check:public-api',
    'check:api-stability', 'check:semantic-api', 'check:laws', 'check:naming',
    'check:layout', 'check:module-dag', 'check:import-boundaries', 'check:dist-boundary',
    'check:subpaths', 'check:package', releaseRequested ? 'check:verification:determinism' : 'check:verification',
  ],
  '@sectile/chart': ['test', 'build', 'typecheck:public:prepared', 'check:laws', 'check:package'],
  '@sectile/form': [
    'test', 'build', 'check:laws', 'check:package', 'check:public-api',
  ],
  '@sectile/temporal': ['test', 'build', 'check:laws', 'check:package'],
  '@sectile/virtual': ['test', 'build', 'check:laws', 'check:package'],
  '@sectile/tabular': ['test', 'build', 'check:laws', 'check:package', 'check:implementation'],
  '@sectile/dom': ['test', 'build'],
  '@sectile/terminal': ['test', 'build'],
  '@sectile/vue': [
    'test', 'typecheck:public:prepared', 'check:controlled-reconciliation',
    'check:hydration-contract', 'build',
  ],
});

const steps = compatibility ? compatibilitySteps() : verificationSteps();
if (explainRequested) {
  process.stdout.write(`${JSON.stringify({
    mode: modeLabel,
    target: targetLabel,
    exact: exactRequested,
    changedFiles,
    scopedChangedFiles,
    selectedPackages: [...selectedPackages],
    preparedPackages: graph.order.filter(({ name }) => dependencyClosure.has(name) && !selectedPackages.has(name)).map(({ name }) => name),
    documentation: includeDocumentation,
    documentationSiteBuild: buildDocumentationSite,
    workspaceGates: [...workspaceGates],
    certificationPerformance: releaseRequested,
    failFast: !continueOnFailure,
    stages: steps.map(({ label }) => label),
    commands: steps.flatMap(({ commands }) => commands.map(({ detail }) => detail)),
  }, null, 2)}\n`);
  process.exitCode = 0;
} else if (steps.length === 0) {
  console.log('verification skipped: no affected targets');
  process.exitCode = 0;
} else {
  const status = await withArtifactSession(
    `${modeLabel} verification (${targetLabel})`,
    () => runVerification(),
  );
  process.exitCode = status;
}

function verificationSteps() {
  const result = fullRepositoryVerification
    ? fullPackageWaveSteps((name) => packagePipelines[name])
    : packageSteps((name) => packagePipelines[name]);
  if (selectedPackages.has('@sectile/tabular')) {
    result.push(packageScriptStep('Tabular raw Virtual witnesses', '@sectile/tabular', ['test:virtual:witnesses']));
  }
  const reproducibleBuilds = reproducibleBuildStep();
  if (reproducibleBuilds !== null) result.push(reproducibleBuilds);
  const publicationArtifacts = publicationArtifactStep();
  if (publicationArtifacts !== null) result.push(publicationArtifacts);
  if (selectedPackages.has('@sectile/form')) {
    result.push(commandStep('Form packed consumer verification', process.execPath, [
      join(root, 'verification', 'consumer-install', 'form.mjs'),
      `--tarball-directory=${publicationPackDirectory}`,
    ]));
  }
  if (includeDocumentation) {
    const documentationScripts = ['generate:check', 'typecheck', 'test'];
    if (buildDocumentationSite) documentationScripts.push('build');
    result.push(packageScriptStep('documentation verification', '@sectile/docs', documentationScripts));
  }
  if (fullRepositoryVerification) result.push(...workspaceContractSteps({ includePerformance: releaseRequested }));
  else result.push(...affectedWorkspaceContractSteps());
  return result;
}

function reproducibleBuildStep() {
  const packageNames = graph.order
    .filter(({ name }) => selectedPackages.has(name))
    .map(({ directory }) => directory);
  if (packageNames.length === 0) return null;
  return commandStep('reproducible package builds', process.execPath, [
    join(root, 'scripts', 'check-reproducible-builds.mjs'),
    '--prepared',
    ...packageNames,
  ]);
}

function publicationArtifactStep() {
  if (!fullRepositoryVerification && !selectedPackages.has('@sectile/form')) return null;
  const packageNames = fullRepositoryVerification
    ? graph.order.map(({ directory }) => directory)
    : formConsumerPackages;
  return commandStep('prepare publication artifacts', process.execPath, [
    join(root, 'scripts', 'publish-packages.mjs'),
    '--pack-only',
    '--prepared',
    `--pack-destination=${publicationPackDirectory}`,
    ...packageNames.map((name) => `--package=${name}`),
  ]);
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

function fullPackageWaveSteps(pipelineFor) {
  const depthByPackage = new Map();
  const waves = [];
  for (const entry of graph.order) {
    const depth = entry.dependencies.reduce(
      (maximum, dependency) => Math.max(maximum, (depthByPackage.get(dependency) ?? -1) + 1),
      0,
    );
    depthByPackage.set(entry.name, depth);
    if (!selectedPackages.has(entry.name)) continue;
    waves[depth] ??= { lanes: [], packages: [] };
    waves[depth].packages.push(entry.name);
    waves[depth].lanes.push(packageScriptCommands(entry.name, pipelineFor(entry.name)));
  }
  return waves.filter(Boolean).map(({ lanes, packages }, index) => parallelLaneStep(
    `verify package wave ${index + 1}: ${packages.join(', ')}`,
    lanes,
  ));
}

function workspaceContractSteps({ includePerformance }) {
  const crossHostTests = crossHostTestPaths();
  const result = [
    commandStep('validation artifact coverage', 'pnpm', ['check:validation-artifacts']),
    commandStep('cross-host verification', process.execPath, ['--test', '--test-concurrency=1', ...crossHostTests]),
    commandStep('tooling verification', 'pnpm', ['test:tooling']),
    commandStep('semantic authority', 'pnpm', ['check:semantic-authority']),
    commandStep('complexity contracts', process.execPath, [join(root, 'scripts', 'check-complexity-contracts.mjs')]),
    commandStep('algorithm reuse inventory', 'pnpm', ['check:algorithm-reuse']),
    commandStep('representation crossovers', 'pnpm', ['check:crossovers']),
    commandStep('entrypoint migrations', 'pnpm', ['check:entrypoint-migrations']),
    commandStep('published source maps', process.execPath, [join(root, 'scripts', 'source-map-policy.mjs'), 'check']),
    commandStep('workspace boundaries', 'pnpm', ['check:boundaries']),
    commandStep('public signatures', 'pnpm', ['check:signatures']),
    commandStep('component completeness', 'pnpm', ['check:components']),
    commandStep('Form scenario completeness', 'pnpm', ['check:form-scenarios']),
    commandStep('component public API', process.execPath, [
      join(root, 'scripts', 'check-component-public-api.mjs'),
    ]),
    commandStep('breaking changes', process.execPath, [join(root, 'scripts', 'check-breaking-changes.mjs')]),
    commandStep('workstream ownership', process.execPath, [join(root, 'scripts', 'check-workstream-ownership.mjs')]),
    parallelStep('consumer verification', [
      commandEntry('consumer bundles', process.execPath, [join(root, 'scripts', 'consumer-bundles', 'run.mjs'), 'check']),
      commandEntry('consumer install', process.execPath, [
        join(root, 'scripts', 'consumer-install', 'run.mjs'),
        'check',
        `--tarball-directory=${publicationPackDirectory}`,
      ]),
    ]),
    commandStep('lifecycle retention', 'pnpm', ['check:lifecycle-retention']),
  ];
  if (includePerformance) {
    result.splice(result.length - 1, 0, commandStep('performance certification', 'pnpm', ['performance:certify:prepared']));
  }
  return result;
}

function affectedWorkspaceContractSteps() {
  const result = [];
  const add = (gate, step) => {
    if (workspaceGates.has(gate)) result.push(step);
  };
  add('cross-host', commandStep('cross-host verification', process.execPath, ['--test', '--test-concurrency=1', ...crossHostTestPaths()]));
  add('tooling', commandStep('tooling verification', 'pnpm', ['test:tooling']));
  add('semantic-authority', commandStep('semantic authority', 'pnpm', ['check:semantic-authority']));
  add('complexity', commandStep('complexity contracts', 'pnpm', ['check:complexity']));
  add('algorithm-reuse', commandStep('algorithm reuse inventory', 'pnpm', ['check:algorithm-reuse']));
  add('representation-crossovers', commandStep('representation crossovers', 'pnpm', ['check:crossovers']));
  add('entrypoint-migrations', commandStep('entrypoint migrations', 'pnpm', ['check:entrypoint-migrations']));
  add('public-signatures', commandStep('public signatures', 'pnpm', ['check:signatures']));
  add('consumer-bundles', commandStep('affected consumer bundles', process.execPath, [
    join(root, 'scripts', 'consumer-bundles', 'run.mjs'),
    'check',
    ...graph.order.filter(({ name }) => selectedPackages.has(name)).map(({ directory }) => directory),
  ]));
  add('form-scenarios', commandStep('Form scenario completeness', 'pnpm', ['check:form-scenarios']));
  return result;
}

function crossHostTestPaths() {
  return readdirSync(join(root, 'verification', 'cross-host'))
    .filter((file) => file.endsWith('.test.mjs'))
    .sort()
    .map((file) => join(root, 'verification', 'cross-host', file));
}

function packageScriptStep(label, packageName, scripts) {
  return Object.freeze({
    commands: Object.freeze(packageScriptCommands(packageName, scripts)),
    label,
  });
}

function packageScriptCommands(packageName, scripts) {
  return scripts.map((script) => commandEntry(
    `${packageName} ${script}`,
    'pnpm',
    ['--filter', packageName, '--silent', 'run', script],
  ));
}

function commandStep(label, command, args) {
  return Object.freeze({
    commands: Object.freeze([commandEntry(label, command, args)]),
    label,
  });
}

function parallelStep(label, commands) {
  return parallelLaneStep(label, commands.map((command) => [command]));
}

function parallelLaneStep(label, lanes) {
  const frozenLanes = Object.freeze(lanes.map((lane) => Object.freeze(lane)));
  return Object.freeze({
    commands: Object.freeze(frozenLanes.flat()),
    label,
    lanes: frozenLanes,
    parallel: true,
  });
}

function commandEntry(detail, command, args) {
  return Object.freeze({ args, command, detail });
}

async function runVerification() {
  const verificationStartedAt = performance.now();
  const startedAt = new Date().toISOString();
  const runID = `${startedAt.replaceAll(':', '-').replaceAll('.', '-')}-${process.pid}`;
  const commandOrder = new Map(steps.flatMap(({ commands }) => commands).map((entry, index) => [entry, index]));
  const commandResults = new Array(commandOrder.size);
  const report = (status, completedAt = null) => {
    const commands = commandResults.filter((command) => command !== undefined);
    return {
      schemaVersion: 1,
      runID,
      mode: modeLabel,
      target: targetLabel,
      startedAt,
      completedAt,
      status,
      stageCount: steps.length,
      commandCount: commands.length,
      failureCount: commands.filter((command) => command.status === 'failed').length,
      commands,
      performanceComparison: releaseRequested ? '.tasks/performance/latest-comparison.json' : null,
    };
  };
  const recordCommandResult = (commandEntry, commandStartedAt, result) => {
    const index = commandOrder.get(commandEntry);
    if (index === undefined) throw new Error(`verification command is not part of the plan: ${commandEntry.detail}`);
    commandResults[index] = {
      detail: commandEntry.detail,
      command: commandEntry.command,
      args: commandEntry.args,
      status: result.error === undefined && result.status === 0 ? 'passed' : 'failed',
      exitCode: result.status ?? null,
      signal: result.signal ?? null,
      elapsedSeconds: elapsedNumber(commandStartedAt),
      error: result.error?.message ?? null,
      stdout: result.status === 0 ? null : boundedFailureOutput(result.stdout),
      stderr: result.status === 0 ? null : boundedFailureOutput(result.stderr),
    };
    writeVerificationReport(report('running'));
    return result;
  };
  writeVerificationReport(report('running'));
  if (verbose) console.log(`verification: ${modeLabel} (${targetLabel}) on ${process.version}`);
  cleanGeneratedOutputs();

  const result = await runVerificationSteps(steps, {
    continueOnFailure,
    onFailure: ({ command, result: commandResult, startedAt }) => {
      reportFailure(command.detail, startedAt, commandResult);
    },
    onStep: (step, index, total) => {
      if (!quietRequested) console.log(`[${index + 1}/${total}] ${step.label}`);
    },
    run: (commandEntry) => {
      const { detail, command, args } = commandEntry;
      if (verbose) console.log(`  ${detail}`);
      const commandStartedAt = performance.now();
      const result = spawnSyncPortable(command, args, {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 32 * 1_024 * 1_024,
        stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
      });
      return recordCommandResult(commandEntry, commandStartedAt, result);
    },
    runAsync: async (commandEntry) => {
      const { detail, command, args } = commandEntry;
      if (verbose) console.log(`  ${detail}`);
      const commandStartedAt = performance.now();
      const result = await runAsyncCommand(command, args);
      if (verbose && result.stdout) process.stdout.write(String(result.stdout));
      if (verbose && result.stderr) process.stderr.write(String(result.stderr));
      return recordCommandResult(commandEntry, commandStartedAt, result);
    },
  });
  writeVerificationReport(report(result.status === 0 ? 'passed' : 'failed', new Date().toISOString()));
  if (result.status !== 0) {
    console.error(`verification failed: ${result.failures.length} command(s) across ${steps.length} stages (${elapsedSeconds(verificationStartedAt)}s)`);
    return result.status;
  }

  console.log(`verification passed: ${steps.length} stages (${elapsedSeconds(verificationStartedAt)}s)`);
  return 0;
}


async function runAsyncCommand(command, args) {
  try {
    const result = await execFilePortable(command, args, {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 32 * 1_024 * 1_024,
    });
    return { error: undefined, status: 0, signal: null, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  } catch (error) {
    const exitCode = typeof error?.code === 'number' ? error.code : null;
    return {
      error: exitCode === null ? error : undefined,
      status: exitCode,
      signal: error?.signal ?? null,
      stdout: error?.stdout ?? '',
      stderr: error?.stderr ?? '',
    };
  }
}

function writeVerificationReport(report) {
  const directory = join(root, '.tasks', 'verification');
  const runsDirectory = join(directory, 'runs');
  const output = `${JSON.stringify(report, null, 2)}\n`;
  mkdirSync(runsDirectory, { recursive: true });
  writeReport(join(runsDirectory, `${report.runID}.json`), output);
  writeReport(join(directory, 'latest.json'), output);
}

function writeReport(path, output) {
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, output, 'utf8');
  renameSync(temporary, path);
}

function cleanGeneratedOutputs() {
  for (const entry of graph.order) {
    if (!dependencyClosure.has(entry.name)) continue;
    rmSync(join(root, 'packages', entry.directory, 'dist'), { recursive: true, force: true });
    rmSync(join(root, 'packages', entry.directory, '.verification-dist'), { recursive: true, force: true });
  }
  rmSync(publicationPackDirectory, { recursive: true, force: true });
  if (includeDocumentation) rmSync(join(root, 'docs', '.vitepress', 'dist'), { recursive: true, force: true });
}

function fileMatchesExplicitTargets(path) {
  for (const target of explicitTargets) {
    if (target === '@sectile/docs') {
      if (path === 'docs' || path.startsWith('docs/')) return true;
      continue;
    }
    const entry = graph.byName.get(target);
    if (entry === undefined) continue;
    if (path.startsWith(`packages/${entry.directory}/`)) return true;
    if (path.startsWith(`docs/packages/${entry.directory}/`)) return true;
    if (path.startsWith(`verification/complexity-contracts/${entry.directory}/`)) return true;
    if (path.startsWith(`verification/consumer-bundles/${entry.directory}/`)) return true;
    if (path.endsWith(`/breaking-changes/${entry.directory}.json`)) return true;
  }
  return false;
}

function collectChangedFiles() {
  const upstream = gitOutput(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], true);
  let base = 'HEAD';
  if (upstream !== null) {
    const mergeBase = gitOutput(['merge-base', 'HEAD', upstream], true);
    if (mergeBase !== null) base = mergeBase;
  }
  const tracked = gitOutput(['diff', '--name-only', '--diff-filter=ACDMRTUXB', base], false) ?? '';
  const untracked = gitOutput(['ls-files', '--others', '--exclude-standard'], false) ?? '';
  return [...new Set(`${tracked}\n${untracked}`.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean))].sort();
}

function gitOutput(args, allowFailure) {
  const result = spawnSyncPortable('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (result.error === undefined && result.status === 0) return String(result.stdout).trim();
  if (allowFailure) return null;
  throw result.error ?? new Error(`git ${args.join(' ')} failed: ${String(result.stderr).trim()}`);
}

function selectedPackagesGraph() {
  return graph;
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

function elapsedNumber(startedAt) {
  return Number(((performance.now() - startedAt) / 1_000).toFixed(3));
}
