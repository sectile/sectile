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
    import { createCalendarState } from '@sectile/core/calendar';
    import { createComboboxState } from '@sectile/core/combobox';
    import { createSliderState } from '@sectile/core/slider';
    import { createTreeViewState } from '@sectile/core/tree-view';
    import { createTreeGridModel, createTreeGridModelFromRows } from '@sectile/core/tree-grid';
    import { createRevisionSnapshot } from '@sectile/core/revision';
    import { createTextEditingState } from '@sectile/core/text';
    import { createFormState } from '@sectile/core/form';
    if (Object.keys(root).length !== 0) throw new Error('root runtime is not empty');
    for (const value of [createSequence, createRange, createGrid, createTree, unwrap, createListboxState, createCalendarState, createComboboxState, createSliderState, createTreeViewState, createTreeGridModel, createTreeGridModelFromRows, createRevisionSnapshot, createTextEditingState, createFormState]) {
      if (typeof value !== 'function') throw new Error('missing runtime export');
    }
  `);
  const runtime = spawnSync(process.execPath, ['consumer.mjs'], { cwd: directory, encoding: 'utf8' });
  assert.equal(runtime.status, 0, runtime.stderr);
  await writeFile(join(directory, 'consumer.ts'), `
    import { createSequence, type Sequence } from '@sectile/core/sequence';
    import { createRange, type QuantizedRange } from '@sectile/core/range';
    import { createGrid, type Grid } from '@sectile/core/grid';
    import { createTree, type Tree } from '@sectile/core/tree';
    import { createListboxState, type ListboxState } from '@sectile/core/listbox';
    import { createCalendarState, type CalendarState } from '@sectile/core/calendar';
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
    const h: CalendarState<string> = createCalendarState(c);
    const i: TreeViewState<string> = createTreeViewState(d);
    const j: ComboboxState<string> = createComboboxState(a);
    const k: TextEditingState = createTextEditingState();
    const l: TreeGridModel<string, string> = createTreeGridModel(d, c, ['a']);
    const rows: readonly TreeGridRowInput<string, string>[] = [{ id: 'a', parentID: null, cells: ['a'] }];
    const m: TreeGridModel<string, string> = createTreeGridModelFromRows(rows);
    const n: FormState = createFormState({ fields: [] });
    void [a, b, c, d, e, f, g, h, i, j, k, l, m, n];
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
  console.log(JSON.stringify({ status: 'passed', subpaths: 15, typeConsumer: 'passed' }, null, 2));
} finally {
  await rm(directory, { recursive: true, force: true });
}
