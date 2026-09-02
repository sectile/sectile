import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { execFilePortable } from '../../scripts/lib/portable-process.mjs';
import { packInstalledDependencyClosure } from './local-dependency-closure.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const packageNames = ['core', 'form', 'temporal', 'dom', 'terminal', 'vue'];
const tarballDirectoryArgument = process.argv.slice(2)
  .find((argument) => argument.startsWith('--tarball-directory='));
const unexpectedArguments = process.argv.slice(2).filter((argument) => (
  argument !== '--'
  && argument !== tarballDirectoryArgument
));
assert.deepEqual(unexpectedArguments, [], `unexpected Form consumer arguments: ${unexpectedArguments.join(', ')}`);
if (tarballDirectoryArgument !== undefined) {
  assert.notEqual(tarballDirectoryArgument.slice('--tarball-directory='.length), '', '--tarball-directory requires a directory');
}
const tarballDirectory = tarballDirectoryArgument === undefined
  ? null
  : resolve(root, tarballDirectoryArgument.slice('--tarball-directory='.length));
const temporary = await mkdtemp(join(tmpdir(), 'sectile-form-consumer-'));
const store = join(temporary, 'pnpm-store');
const packDirectory = tarballDirectory ?? join(temporary, 'packs');
const tarballs = {};
let vueDependency;

try {
  for (const name of packageNames) {
    if (tarballDirectory === null) await run('pnpm', ['--filter', `@sectile/${name}`, 'build'], root);
    const destination = packDirectory;
    await mkdir(destination, { recursive: true });
    if (tarballDirectory === null) await run('pnpm', ['--filter', `@sectile/${name}`, 'pack', '--pack-destination', destination], root);
    const prefix = `sectile-${name}-`;
    const file = (await readdir(destination))
      .find((entry) => entry.startsWith(prefix) && entry.endsWith('.tgz'));
    assert.notEqual(file, undefined, `packed tarball missing for @sectile/${name}`);
    tarballs[name] = join(destination, file);
  }
  vueDependency = await packInstalledDependencyClosure(
    resolve(root, 'packages/vue/node_modules/vue/package.json'),
    join(temporary, 'dependency-packs'),
  );

  await runTasks([
    verifyDirectFormConsumer,
    verifyDOMBaseConsumer,
    verifyVueBaseConsumer,
    verifyDOMFormConsumer,
    verifyVueFormConsumer,
    verifyTerminalConsumer,
  ], 4);

  console.log('Form packed consumers passed: direct, optional-peer, DOM, Vue, typing, and Terminal absence');
} finally {
  await rm(temporary, { recursive: true, force: true });
}

async function verifyDirectFormConsumer() {
  const directory = await fixture('form', [tarballs.core, tarballs.form]);
  await runtime(directory, `
    const root = await import('@sectile/form');
    const state = await import('@sectile/form/state');
    const path = await import('@sectile/form/path');
    if (Object.keys(root).length !== 0 || typeof state.tryCreateFormState !== 'function' || typeof path.createFormFieldPath !== 'function') process.exit(2);
  `);
}

async function verifyDOMBaseConsumer() {
  const directory = await fixture('dom-base', [tarballs.core, tarballs.dom]);
  await runtime(directory, `
    const dom = await import('@sectile/dom');
    if (typeof dom.createCheckbox !== 'function') process.exit(2);
  `);
  await missingPeer(directory, '@sectile/dom/form', '@sectile/form');
}

async function verifyVueBaseConsumer() {
  const directory = await fixture('vue-base', [
    tarballs.core,
    tarballs.dom,
    tarballs.vue,
    vueDependency.entryTarball,
  ]);
  await runtime(directory, `
    const vue = await import('@sectile/vue');
    if (typeof vue.CheckboxRoot !== 'object') process.exit(2);
  `);
  await missingPeer(directory, '@sectile/vue/form', '@sectile/form');
}

async function verifyDOMFormConsumer() {
  const directory = await fixture('dom-form', [tarballs.core, tarballs.form, tarballs.dom]);
  await runtime(directory, `
    const form = await import('@sectile/dom/form');
    if (typeof form.createForm !== 'function' || typeof form.defineFormSubmission !== 'function') process.exit(2);
  `);
}

async function verifyVueFormConsumer() {
  const directory = await fixture('vue-form', [
    tarballs.core,
    tarballs.form,
    tarballs.dom,
    tarballs.vue,
    vueDependency.entryTarball,
  ]);
  await runtime(directory, `
    const form = await import('@sectile/vue/form');
    if (typeof form.FormRoot !== 'object' || typeof form.defineFormSubmission !== 'function') process.exit(2);
  `);
  await typeConsumer(directory);
}

async function verifyTerminalConsumer() {
  const directory = await fixture('terminal', [
    tarballs.core,
    tarballs.temporal,
    tarballs.terminal,
  ]);
  await runtime(directory, `
    const terminal = await import('@sectile/terminal');
    if ('createForm' in terminal || Object.keys(terminal).some((name) => name.startsWith('Form'))) process.exit(2);
  `);
  await missingSubpath(directory, '@sectile/terminal/form');
}

async function runTasks(tasks, concurrency) {
  let nextIndex = 0;
  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= tasks.length) return;
      await tasks[index]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
}

async function fixture(name, dependencies) {
  const directory = join(temporary, name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`);
  await writeFile(join(directory, 'pnpm-workspace.yaml'), [
    'packages:',
    "  - '.'",
    'overrides:',
    ...Object.entries(tarballs)
      .map(([packageName, path]) => `  '@sectile/${packageName}': 'file:${path}'`),
    ...Object.entries(vueDependency.overrides)
      .map(([packageName, path]) => `  '${packageName}': 'file:${path}'`),
    '',
  ].join('\n'));
  await run('pnpm', ['add', '--offline', '--store-dir', store, ...dependencies], directory);
  return directory;
}

async function runtime(directory, source) {
  const path = join(directory, 'consumer.mjs');
  await writeFile(path, source);
  await run(process.execPath, [path], directory);
}

async function missingPeer(directory, specifier, peer) {
  const result = await runResult(process.execPath, ['--input-type=module', '--eval', `await import('${specifier}')`], directory);
  assert.notEqual(result.status, 0, `${specifier} unexpectedly loaded without ${peer}`);
  assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(peer.replace('/', '\\/'), 'u'));
}

async function missingSubpath(directory, specifier) {
  const result = await runResult(process.execPath, ['--input-type=module', '--eval', `await import('${specifier}')`], directory);
  assert.notEqual(result.status, 0, `${specifier} unexpectedly exists`);
  assert.match(`${result.stdout}\n${result.stderr}`, /ERR_PACKAGE_PATH_NOT_EXPORTED|not defined by "exports"/u);
}

async function typeConsumer(directory) {
  await writeFile(join(directory, 'consumer.ts'), `
    import { createFormState, type FormIssue } from '@sectile/form/state';
    import { defineFormSubmission, type FormSummarySlotProps } from '@sectile/vue/form';
    const issue = {
      id: 'lookup-mismatch',
      message: 'Check both values.',
      source: 'server',
      fieldId: 'order-number',
      relatedFieldIds: ['email'],
    } satisfies FormIssue<string>;
    const state = createFormState({
      fields: [{ id: 'order-number' }, { id: 'email' }],
      issues: [issue],
    });
    state.validation.status satisfies 'idle' | 'validating' | 'valid' | 'invalid';
    state.submission.failure satisfies { readonly message: string } | null;
    state.allIssues satisfies readonly FormIssue<string>[];
    // @ts-expect-error lifecycle state is grouped under submission
    state.submissionStatus;
    declare const summary: FormSummarySlotProps;
    summary.serverIssues satisfies readonly FormIssue[];
    summary.firstIssue satisfies FormIssue | null;
    const schema = {
      '~standard': {
        version: 1 as const,
        vendor: 'consumer',
        types: undefined as unknown as {
          input: { email: string };
          output: { accountId: number };
        },
        validate: (_value: unknown) => ({ value: { accountId: 1 } }),
      },
    };
    defineFormSubmission({
      schema,
      onSubmit: ({ values }) => {
        values.accountId satisfies number;
        // @ts-expect-error schema output is not the raw input
        values.email;
      },
    });
    defineFormSubmission({
      onSubmit: () => ({
        ok: false as const,
        failure: { message: 'Try again.' },
        issues: [{
          path: 'orderNumber',
          relatedPaths: ['email'],
          message: 'Check both values.',
        }],
      }),
    });
  `);
  await writeFile(join(directory, 'tsconfig.json'), `${JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      skipLibCheck: false,
    },
    files: ['consumer.ts'],
  }, null, 2)}\n`);
  await run(process.execPath, [
    resolve(root, 'packages/vue/node_modules/typescript/bin/tsc'),
    '--project',
    'tsconfig.json',
    '--pretty',
    'false',
  ], directory);
}

async function run(command, args, cwd) {
  try {
    return await execFilePortable(command, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    assert.fail(
      `${command} ${args.map((value) => basename(value)).join(' ')}\n${error.stdout ?? ''}\n${error.stderr ?? ''}`,
    );
  }
}

async function runResult(command, args, cwd) {
  try {
    const result = await execFilePortable(command, args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    return { ...result, status: 0 };
  } catch (error) {
    return {
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
      status: Number.isInteger(error.code) ? error.code : 1,
    };
  }
}
