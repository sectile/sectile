import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { CascadeSelectColumn, CascadeSelectContent, CascadeSelectItem, CascadeSelectItemChevron, CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectValue } from '../dist/cascade-select.js';

const nodes = [{ id: 'asia', parentID: null }, { id: 'seoul', parentID: 'asia' }];
test('Vue cascade select exposes native-like compound parts during SSR', async () => {
  const app = createSSRApp({ render: () => h(CascadeSelectRoot, { nodes, defaultOpen: true, defaultValue: 'seoul', textValue: (id) => ({ asia: 'Asia', seoul: 'Seoul' })[id] }, { default: () => [h(CascadeSelectTrigger, null, { default: () => h(CascadeSelectValue) }), h(CascadeSelectContent, null, { default: ({ columns }) => columns.map((_, depth) => h(CascadeSelectColumn, { depth }, { default: ({ items }) => items.map((item) => h(CascadeSelectItem, { value: item }, { default: ({ branch }) => [item, branch ? h(CascadeSelectItemChevron, null, { default: () => '›' }) : null] })) })) })] }) });
  const html = await renderToString(app); assert.match(html, /data-scope="cascade-select"/); assert.match(html, /Asia \/ Seoul/); assert.match(html, /role="listbox"/);
});
