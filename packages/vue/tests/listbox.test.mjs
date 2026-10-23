import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import {
  ListboxItem,
  ListboxItemIndicator,
  ListboxItemText,
  ListboxRoot,
} from '../.verification-dist/listbox.js';
import { createTestWindow } from './happy-dom.mjs';
import { createHostNode, createTestRenderer } from './renderer.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
const items = ['alpha', 'beta', 'nightly'];

test('Vue listbox associates only a rendered current option and reports full-domain positions', async () => {
  for (const renderedItems of [[], ['alpha'], ['beta']]) {
    const html = await renderToString(createSSRApp({ render: () => h(ListboxRoot, {
      items, defaultValue: 'beta', renderedItems,
    }, { default: () => renderedItems.map(value => h(ListboxItem, { value }, () => value)) }) }));
    browserWindow.document.body.innerHTML = html;
    const root = browserWindow.document.querySelector('[role="listbox"]');
    const option = browserWindow.document.querySelector('[role="option"]');
    if (renderedItems.includes('beta')) assert.equal(root.getAttribute('aria-activedescendant'), option.id);
    else assert.equal(root.hasAttribute('aria-activedescendant'), false);
    if (option) {
      assert.equal(option.getAttribute('aria-setsize'), '3');
      assert.equal(option.getAttribute('aria-posinset'), String(items.indexOf(renderedItems[0]) + 1));
    }
  }
});

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
      'aria-label': 'Channels',
      name: 'channel',
      required: true,
    }, { default: options }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="listbox"/);
  assert.match(html, /aria-label="Channels"/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-activedescendant="sectile-listbox-/);
  assert.match(html, /role="option"/);
  assert.match(html, /id="sectile-listbox-/);
  assert.match(html, /aria-selected="true"/);
  assert.match(html, /data-part="item-indicator"/);
  assert.match(html, /<select/);
  assert.match(html, /name="channel"/);
  const disabled = await renderToString(createSSRApp({ render: () => h(ListboxRoot, {
    items, defaultValue: 'beta', name: 'disabled-channel', disabled: true,
  }, { default: options }) }));
  browserWindow.document.body.innerHTML = disabled;
  assert.equal(browserWindow.document.querySelector('select').disabled, true);
  assert.equal(browserWindow.document.querySelector('option[value="beta"]').hasAttribute('selected'), true);
  const empty = await renderToString(createSSRApp({ render: () => h(ListboxRoot, {
    items, name: 'empty-channel', required: true,
  }, { default: options }) }));
  browserWindow.document.body.innerHTML = empty;
  const select = browserWindow.document.querySelector('select');
  assert.equal(select.required, true);
  assert.equal(select.options.item(0).value, '', 'required single select uses the first option as its empty placeholder');
  assert.equal(select.options.item(0).selected, true); assert.equal(select.value, '');
});

test('Vue listbox generated IDs preserve exact values and active-descendant linkage', async () => {
  const exactItems = ['%', '-25', '/', '-2F', 'a%b', 'a-25b', 'é', 'e\u0301'];
  const app = createSSRApp({
    render: () => h(ListboxRoot, {
      items: exactItems,
      defaultValue: exactItems[0],
    }, {
      default: () => exactItems.map((value) => h(ListboxItem, { value }, () => value)),
    }),
  });
  const html = await renderToString(app);
  browserWindow.document.body.innerHTML = html;
  const root = browserWindow.document.querySelector('[role="listbox"]');
  const options = [...browserWindow.document.querySelectorAll('[role="option"]')];
  assert.equal(options.length, exactItems.length);
  assert.equal(new Set(options.map((option) => option.id)).size, exactItems.length);
  assert.equal(root?.getAttribute('aria-activedescendant'), options[0]?.id);
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

test('Vue listbox warns when ownership changes without a remount', async () => {
  const renderer = createTestRenderer();
  const value = ref(undefined);
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const app = renderer.createApp({
      render: () => h(ListboxRoot, { items, modelValue: value.value }, { default: options }),
    });
    app.mount(createHostNode('root'));
    value.value = 'alpha';
    await nextTick();
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /cannot switch modelValue/);
    assert.match(warnings[0], /Remount/);
  } finally {
    console.warn = originalWarn;
  }
});
