import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const directory = await mkdtemp(join(tmpdir(), 'sectile-subpaths-'));
try {
  const scope = join(directory, 'node_modules', '@sectile');
  await mkdir(scope, { recursive: true });
  await symlink(resolve('.'), join(scope, 'primitives'), 'dir');
  await writeFile(join(directory, 'consumer.mjs'), `
    import * as root from '@sectile/primitives';
    import { createSequence } from '@sectile/primitives/sequence';
    import { createRange } from '@sectile/primitives/range';
    import { createGrid } from '@sectile/primitives/grid';
    import { createTree } from '@sectile/primitives/tree';
    import { unwrap } from '@sectile/primitives/result';
    import { createListboxState } from '@sectile/primitives/listbox';
    import { createCalendarState } from '@sectile/primitives/calendar';
    import { createComboboxState } from '@sectile/primitives/combobox';
    import { createSliderState } from '@sectile/primitives/slider';
    import { createTreeViewState } from '@sectile/primitives/tree-view';
    import { createTreeGridModel, createTreeGridModelFromRows } from '@sectile/primitives/tree-grid';
    import { createRevisionSnapshot } from '@sectile/primitives/revision';
    import { createTextEditingState } from '@sectile/primitives/text';
    if (Object.keys(root).length !== 0) throw new Error('root runtime is not empty');
    for (const value of [createSequence, createRange, createGrid, createTree, unwrap, createListboxState, createCalendarState, createComboboxState, createSliderState, createTreeViewState, createTreeGridModel, createTreeGridModelFromRows, createRevisionSnapshot, createTextEditingState]) {
      if (typeof value !== 'function') throw new Error('missing runtime export');
    }
  `);
  const runtime = spawnSync(process.execPath, ['consumer.mjs'], { cwd: directory, encoding: 'utf8' });
  assert.equal(runtime.status, 0, runtime.stderr);
  await writeFile(join(directory, 'consumer.ts'), `
    import type { Result } from '@sectile/primitives';
    import { unwrap } from '@sectile/primitives/result';
    import { createSequence, type Sequence } from '@sectile/primitives/sequence';
    import { createRange, type QuantizedRange } from '@sectile/primitives/range';
    import { createGrid, type Grid } from '@sectile/primitives/grid';
    import { createTree, type Tree } from '@sectile/primitives/tree';
    import { createListboxState, type ListboxState } from '@sectile/primitives/listbox';
    import { createCalendarState, type CalendarState } from '@sectile/primitives/calendar';
    import { createComboboxState, type ComboboxState } from '@sectile/primitives/combobox';
    import { createSliderState, type SliderState } from '@sectile/primitives/slider';
    import { createTreeViewState, type TreeViewState } from '@sectile/primitives/tree-view';
    import { createTreeGridModel, createTreeGridModelFromRows, type TreeGridModel, type TreeGridRowInput } from '@sectile/primitives/tree-grid';
    import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/primitives/revision';
    import { createTextEditingState, type TextEditingState } from '@sectile/primitives/text';
    const a: Result<Sequence<string>> = createSequence(['a']);
    const b: Result<QuantizedRange> = createRange({ origin: '0', step: '1', count: 1 });
    const c: Result<Grid<string>> = createGrid([['a']]);
    const d: Result<Tree<string>> = createTree([{ id: 'a', parentID: null }]);
    if (!a.ok) throw new Error(a.error.message);
    const e: Result<ListboxState<string>> = createListboxState(a.value);
    const f: Result<RevisionSnapshot<string>> = createRevisionSnapshot('state');
    if (!b.ok) throw new Error(b.error.message);
    const g: Result<SliderState> = createSliderState(b.value);
    if (!c.ok) throw new Error(c.error.message);
    const h: Result<CalendarState<string>> = createCalendarState(c.value);
    if (!d.ok) throw new Error(d.error.message);
    const i: Result<TreeViewState<string>> = createTreeViewState(d.value);
    const j: Result<ComboboxState<string>> = createComboboxState(a.value);
    const k: Result<TextEditingState> = createTextEditingState();
    const l: Result<TreeGridModel<string, string>> = createTreeGridModel(d.value, c.value, ['a']);
    const rows: readonly TreeGridRowInput<string, string>[] = [{ id: 'a', parentID: null, cells: ['a'] }];
    const m: Result<TreeGridModel<string, string>> = createTreeGridModelFromRows(rows);
    const sequence: Sequence<string> = unwrap(a);
    void [a, b, c, d, e, f, g, h, i, j, k, l, m, sequence];
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
