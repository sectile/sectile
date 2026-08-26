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

test('Vue listbox reconciles uncontrolled selection when items disappear', async () => {
  const renderer = createTestRenderer();
  const currentItems = ref(['alpha', 'beta']);
  let slotValue;
  let highlightedValue;
  const app = renderer.createApp({
    render: () => h(ListboxRoot, {
      items: currentItems.value,
      defaultValue: 'beta',
    }, {
      default: (slot) => {
        slotValue = slot.value;
        highlightedValue = slot.highlightedValue;
        return currentItems.value.map((value) => h(ListboxItem, { value }, () => value));
      },
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  assert.equal(slotValue, 'beta');

  currentItems.value = ['alpha'];
  await nextTick();
  assert.equal(slotValue, '');
  assert.equal(highlightedValue, 'alpha');
});

test('Vue listbox proposes a valid controlled value when its domain changes', async () => {
  const renderer = createTestRenderer();
  const currentItems = ref(['alpha', 'beta']);
  const value = ref('beta');
  const updates = [];
  const app = renderer.createApp({
    render: () => h(ListboxRoot, {
      items: currentItems.value,
      modelValue: value.value,
      'onUpdate:modelValue': (next) => {
        updates.push(next);
        value.value = next;
      },
    }, {
      default: () => currentItems.value.map((item) => h(ListboxItem, { value: item }, () => item)),
    }),
  });
  const container = createHostNode('root');
  app.mount(container);

  currentItems.value = ['alpha'];
  await nextTick();
  await nextTick();
  assert.deepEqual(updates, ['']);
  assert.equal(value.value, '');
});
