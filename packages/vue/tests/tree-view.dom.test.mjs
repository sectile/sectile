import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MouseEvent: browserWindow.MouseEvent,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, h, nextTick, ref } = await import('vue');
const {
  TreeViewDisclosure,
  TreeViewGroup,
  TreeViewItem,
  TreeViewRoot,
} = await import('../.verification-dist/tree-view.js');

test('Vue tree view controls groups through expandedValues v-model', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const expandedValues = ref([]);
  const app = createApp({
    render: () => h(TreeViewRoot, {
      nodes: [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }],
      expandedValues: expandedValues.value,
      'onUpdate:expandedValues': (value) => { expandedValues.value = value; },
    }, {
      default: () => [
        h(TreeViewItem, { value: 'root' }, {
          default: () => h(TreeViewDisclosure, { for: 'root', as: 'button' }, () => 'Toggle root'),
        }),
        h(TreeViewGroup, { for: 'root' }, {
          default: () => h(TreeViewItem, { value: 'leaf' }, () => 'Leaf'),
        }),
      ],
    }),
  });

  app.mount(host);
  await nextTick();
  const disclosure = host.querySelector('[data-part="disclosure"]');
  const group = host.querySelector('[data-part="group"]');
  assert.ok(disclosure instanceof HTMLElement);
  assert.ok(group instanceof HTMLElement);
  assert.equal(group.hidden, true);

  disclosure.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await nextTick();
  assert.deepEqual(expandedValues.value, ['root']);
  assert.equal(group.hidden, false);
  assert.equal(group.dataset['state'], 'open');

  app.unmount();
  host.remove();
});

test('Vue tree view reconciles selection, expansion, and focus after nodes change', async () => {
  const host = document.createElement('div');
  document.body.append(host);
  const nodes = ref([{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }]);
  const value = ref(['leaf']);
  const expanded = ref(['root']);
  const highlighted = ref('leaf');
  const app = createApp({
    render: () => h(TreeViewRoot, {
      nodes: nodes.value,
      modelValue: value.value,
      expandedValues: expanded.value,
      highlightedValue: highlighted.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
      'onUpdate:expandedValues': (next) => { expanded.value = next; },
      'onUpdate:highlightedValue': (next) => { highlighted.value = next; },
    }, {
      default: () => nodes.value.map((node) => h(TreeViewItem, { key: node.id, value: node.id }, () => node.id)),
    }),
  });

  app.mount(host);
  await nextTick();
  nodes.value = [{ id: 'other', parentID: null }];
  await nextTick();
  await nextTick();

  assert.deepEqual(value.value, []);
  assert.deepEqual(expanded.value, []);
  assert.equal(highlighted.value, 'other');

  app.unmount();
  host.remove();
});
