import assert from 'node:assert/strict';
import test from 'node:test';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { CascadeSelectColumn, CascadeSelectContent, CascadeSelectItem, CascadeSelectItemChevron, CascadeSelectRoot, CascadeSelectTrigger, CascadeSelectValue } from '../.verification-dist/cascade-select.js';

const nodes = [{ id: 'asia', parentID: null }, { id: 'seoul', parentID: 'asia' }];
test('Vue cascade select exposes native-like compound parts during SSR', async () => {
  const app = createSSRApp({ render: () => h(CascadeSelectRoot, { nodes, defaultOpen: true, defaultValue: 'seoul', textValue: (id) => ({ asia: 'Asia', seoul: 'Seoul' })[id] }, { default: () => [h(CascadeSelectTrigger, null, { default: () => h(CascadeSelectValue) }), h(CascadeSelectContent, null, { default: ({ columns }) => columns.map((_, depth) => h(CascadeSelectColumn, { depth }, { default: ({ items }) => items.map((item) => h(CascadeSelectItem, { value: item }, { default: ({ branch }) => [item, branch ? h(CascadeSelectItemChevron, null, { default: () => '›' }) : null] })) })) })] }) });
  const html = await renderToString(app); assert.match(html, /data-scope="cascade-select"/); assert.match(html, /Asia \/ Seoul/); assert.match(html, /role="listbox"/);
});

test('Vue cascade select SSR projects canonical selection into its submission options', async () => {
  for (const [props, expected] of [
    [{ defaultValue: 'seoul' }, 'seoul'],
    [{ modelValue: 'seoul', defaultValue: null }, 'seoul'],
    [{ modelValue: null, defaultValue: 'seoul' }, ''],
  ]) {
    const html = await renderToString(createSSRApp({ render: () => h(CascadeSelectRoot, { nodes, name: 'location', ...props }) }));
    const selected = (html.match(/<option\b[^>]*>/g) ?? []).filter(tag => /\sselected(?:[\s=>])/.test(tag));
    assert.equal(selected.length, 1);
    assert.match(selected[0], expected ? /value="seoul"/ : /value(?:="")?\s/);
  }
});
