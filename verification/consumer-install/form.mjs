import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { packInstalledDependencyClosure } from './local-dependency-closure.mjs';

const root = resolve(import.meta.dirname, '..', '..');
const packageNames = ['core', 'form', 'temporal', 'dom', 'terminal', 'vue'];
const temporary = await mkdtemp(join(tmpdir(), 'sectile-form-consumer-'));
const store = join(temporary, 'pnpm-store');
const tarballs = {};
let vueDependency;

try {
  for (const name of packageNames) {
    run('pnpm', ['--filter', `@sectile/${name}`, 'build'], root);
    const destination = join(temporary, 'packs');
    await mkdir(destination, { recursive: true });
    run('pnpm', ['--filter', `@sectile/${name}`, 'pack', '--pack-destination', destination], root);
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

  const form = await fixture('form', [tarballs.core, tarballs.form]);
  await runtime(form, `
    const root = await import('@sectile/form');
    const state = await import('@sectile/form/state');
    const path = await import('@sectile/form/path');
    if (Object.keys(root).length !== 0 || typeof state.tryCreateFormState !== 'function' || typeof path.createFormFieldPath !== 'function') process.exit(2);
  `);

  const domBase = await fixture('dom-base', [tarballs.core, tarballs.dom]);
  await runtime(domBase, `
    const dom = await import('@sectile/dom');
    if (typeof dom.createCheckbox !== 'function') process.exit(2);
  `);
  await missingPeer(domBase, '@sectile/dom/form', '@sectile/form');

  const vueBase = await fixture('vue-base', [
    tarballs.core,
    tarballs.dom,
    tarballs.vue,
    vueDependency.entryTarball,
  ]);
  await runtime(vueBase, `
    const vue = await import('@sectile/vue');
    if (typeof vue.CheckboxRoot !== 'object') process.exit(2);
  `);
  await missingPeer(vueBase, '@sectile/vue/form', '@sectile/form');

  const domForm = await fixture('dom-form', [tarballs.core, tarballs.form, tarballs.dom]);
  await runtime(domForm, `
    const form = await import('@sectile/dom/form');
    if (typeof form.createForm !== 'function' || typeof form.defineFormSubmission !== 'function') process.exit(2);
  `);

  const vueForm = await fixture('vue-form', [
    tarballs.core,
    tarballs.form,
    tarballs.dom,
    tarballs.vue,
    vueDependency.entryTarball,
  ]);
  await runtime(vueForm, `
    const form = await import('@sectile/vue/form');
    if (typeof form.FormRoot !== 'object' || typeof form.defineFormSubmission !== 'function') process.exit(2);
  `);
  await typeConsumer(vueForm);

  const terminal = await fixture('terminal', [
    tarballs.core,
    tarballs.temporal,
    tarballs.terminal,
  ]);
  await runtime(terminal, `
    const terminal = await import('@sectile/terminal');
    if ('createForm' in terminal || Object.keys(terminal).some((name) => name.startsWith('Form'))) process.exit(2);
  `);
  await missingSubpath(terminal, '@sectile/terminal/form');

  console.log('Form packed consumers passed: direct, optional-peer, DOM, Vue, typing, and Terminal absence');
} finally {
  await rm(temporary, { recursive: true, force: true });
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
  run('pnpm', ['add', '--offline', '--store-dir', store, ...dependencies], directory);
  return directory;
}

async function runtime(directory, source) {
  const path = join(directory, 'consumer.mjs');
  await writeFile(path, source);
  run(process.execPath, [path], directory);
}

async function missingPeer(directory, specifier, peer) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import('${specifier}')`], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, `${specifier} unexpectedly loaded without ${peer}`);
  assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(peer.replace('/', '\\/'), 'u'));
}

async function missingSubpath(directory, specifier) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import('${specifier}')`], {
    cwd: directory,
    encoding: 'utf8',
  });
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
  run(process.execPath, [
    resolve(root, 'packages/vue/node_modules/typescript/bin/tsc'),
    '--project',
    'tsconfig.json',
    '--pretty',
    'false',
  ], directory);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  assert.equal(
    result.status,
    0,
    `${command} ${args.map((value) => basename(value)).join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
}
