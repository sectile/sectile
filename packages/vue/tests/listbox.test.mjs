import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import {
  ListboxItem,
  ListboxItemIndicator,
  ListboxItemText,
  ListboxRoot,
} from '../dist/listbox.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

const items = ['alpha', 'beta', 'nightly'];

function options() {
  return items.map((value) => h(ListboxItem, { value }, {
    default: () => [
      h(ListboxItemText, null, () => value),
      h(ListboxItemIndicator, null, () => 'Selected'),
    ],
  }));
}

test('Vue listbox projects native listbox semantics and form state', async () => {
  const app = createSSRApp({
    render: () => h(ListboxRoot, {
      items,
      defaultValue: 'beta',
      name: 'channel',
      required: true,
    }, { default: options }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="listbox"/);
  assert.match(html, /role="option"/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /data-part="item-indicator"/);
  assert.match(html, /<select/);
  assert.match(html, /name="channel"/);
});

test('Vue listbox follows controlled single selection', async () => {
  const renderer = createTestRenderer();
  const value = ref('alpha');
  const app = renderer.createApp({
    render: () => h(ListboxRoot, {
      items,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, { default: options }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  root.children[1].props.onClick({ defaultPrevented: false, currentTarget: {
    closest: () => undefined,
  } });
  await nextTick();
  assert.equal(value.value, 'beta');
  assert.equal(root.children[1].props['aria-selected'], 'true');
});

test('Vue listbox keeps disabled items out of interaction', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(ListboxRoot, {
      items,
      defaultValue: 'alpha',
      disabledItems: ['beta'],
    }, { default: options }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  assert.equal(root.children[1].props['aria-disabled'], 'true');
  root.children[1].props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(root.children[0].props['aria-selected'], 'true');
});
