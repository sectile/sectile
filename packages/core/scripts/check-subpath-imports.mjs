import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const directory = await mkdtemp(join(tmpdir(), 'sectile-subpaths-'));
try {
  const scope = join(directory, 'node_modules', '@sectile');
  await mkdir(scope, { recursive: true });
  await symlink(resolve('.'), join(scope, 'core'), 'dir');
  await writeFile(join(directory, 'consumer.mjs'), `
    import * as root from '@sectile/core';
    import { createSequence } from '@sectile/core/sequence';
    import { createRange } from '@sectile/core/range';
    import { createGrid } from '@sectile/core/grid';
    import { createTree } from '@sectile/core/tree';
    import { unwrap } from '@sectile/core/result';
    import { createListboxState } from '@sectile/core/listbox';
    import { createComboboxState } from '@sectile/core/combobox';
    import { createSliderState } from '@sectile/core/slider';
    import { createTreeViewState } from '@sectile/core/tree-view';
    import { createTreeGridModel, createTreeGridModelFromRows } from '@sectile/core/tree-grid';
    import { createRevisionSnapshot } from '@sectile/core/revision';
    import { createTextEditingState } from '@sectile/core/text';
    import { createFormState } from '@sectile/core/form';
    if (Object.keys(root).length !== 0) throw new Error('root runtime is not empty');
    for (const value of [createSequence, createRange, createGrid, createTree, unwrap, createListboxState, createComboboxState, createSliderState, createTreeViewState, createTreeGridModel, createTreeGridModelFromRows, createRevisionSnapshot, createTextEditingState, createFormState]) {
      if (typeof value !== 'function') throw new Error('missing runtime export');
    }
  `);
  const runtime = spawnSync(process.execPath, ['consumer.mjs'], { cwd: directory, encoding: 'utf8' });
  assert.equal(runtime.status, 0, runtime.stderr);
  await writeFile(join(directory, 'consumer.ts'), `
    import type { CoreErrorCode, Result } from '@sectile/core';
    import type { HostAdapter } from '@sectile/core/adapter-runtime';
    import { createSequence, type Sequence } from '@sectile/core/sequence';
    import { createRange, type QuantizedRange } from '@sectile/core/range';
    import { createGrid, type Grid } from '@sectile/core/grid';
    import { createTree, type Tree } from '@sectile/core/tree';
    import { createListboxState, type ListboxState } from '@sectile/core/listbox';
    import { createComboboxState, type ComboboxState } from '@sectile/core/combobox';
    import { createSliderState, type SliderState } from '@sectile/core/slider';
    import { createTreeViewState, type TreeViewState } from '@sectile/core/tree-view';
    import { createTreeGridModel, createTreeGridModelFromRows, type TreeGridModel, type TreeGridRowInput } from '@sectile/core/tree-grid';
    import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
    import { createTextEditingState, type TextEditingState } from '@sectile/core/text';
    import { createFormState, type FormState } from '@sectile/core/form';
    const a: Sequence<string> = createSequence(['a']);
    const b: QuantizedRange = createRange({ origin: '0', step: '1', count: 1 });
    const c: Grid<string> = createGrid([['a']]);
    const d: Tree<string> = createTree([{ id: 'a', parentID: null }]);
    const e: ListboxState<string> = createListboxState(a);
    const f: RevisionSnapshot<string> = createRevisionSnapshot('state');
    const g: SliderState = createSliderState(b);
    const h: TreeViewState<string> = createTreeViewState(d);
    const i: ComboboxState<string> = createComboboxState(a);
    const j: TextEditingState = createTextEditingState();
    const k: TreeGridModel<string, string> = createTreeGridModel(d, c, ['a']);
    const rows: readonly TreeGridRowInput<string, string>[] = [{ id: 'a', parentID: null, cells: ['a'] }];
    const l: TreeGridModel<string, string> = createTreeGridModelFromRows(rows);
    const m: FormState = createFormState({ fields: [] });
    declare const failure: Result<number, 'no-cursor'>;
    if (!failure.ok) {
      const code: 'no-cursor' = failure.error.code;
      void code;
    }
    declare const adapter: HostAdapter<string, string, string>;
    const customFailure = adapter.reject('consumer-invented-error', 'consumer failure');
    if (!customFailure.ok) {
      const customCode: 'consumer-invented-error' = customFailure.error.code;
      void customCode;
    }
    // @ts-expect-error Core codes remain a closed package-local contract
    const unknownCoreCode: CoreErrorCode = 'consumer-invented-error';
    void [a, b, c, d, e, f, g, h, i, j, k, l, m, unknownCoreCode];
  `);
  await writeFile(join(directory, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
      skipLibCheck: false, noEmit: true,
    },
    files: ['consumer.ts'],
  }));
  const typecheck = spawnSync('tsc', ['--project', 'tsconfig.json', '--pretty', 'false'], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.equal(typecheck.status, 0, `${typecheck.stdout}\n${typecheck.stderr}`);
  console.log(JSON.stringify({ status: 'passed', subpaths: 14, typeConsumer: 'passed' }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
