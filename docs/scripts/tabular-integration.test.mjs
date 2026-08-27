import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Tabular documentation covers profiles, Vue injection, source ownership, and opt-in Virtual', async () => {
  const [overview, vue, virtual, koOverview, koVue, koVirtual, config] = await Promise.all([
    read('packages/tabular.md'),
    read('packages/tabular/vue.md'),
    read('packages/tabular/virtual.md'),
    read('ko/packages/tabular.md'),
    read('ko/packages/tabular/vue.md'),
    read('ko/packages/tabular/virtual.md'),
    read('.vitepress/config.ts'),
  ]);
  for (const source of [overview, koOverview]) {
    for (const profile of ['DataTable', 'DataGrid', 'DataTreeGrid']) assert.match(source, new RegExp(profile));
    assert.match(source, /terminal/iu);
  }
  for (const source of [vue, koVue]) {
    assert.match(source, /DataTableProvider|DataGridProvider/u);
    assert.match(source, /useData(?:Table|Grid)Source/u);
    assert.match(source, /loading/iu);
  }
  for (const source of [virtual, koVirtual]) {
    assert.match(source, /@sectile\/tabular\/virtual/u);
    assert.match(source, /@sectile\/vue\/virtual/u);
    assert.match(source, /pnpm add @sectile\/vue @sectile\/virtual vue/u);
  }
  assert.match(config, /\/packages\/tabular\/vue/u);
  assert.match(config, /\/ko\/packages\/tabular\/virtual/u);
});
