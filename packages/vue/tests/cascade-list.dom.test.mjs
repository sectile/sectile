import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  HTMLInputElement: browserWindow.HTMLInputElement,
  HTMLSelectElement: browserWindow.HTMLSelectElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  KeyboardEvent: browserWindow.KeyboardEvent,
  MouseEvent: browserWindow.MouseEvent,
  FormData: browserWindow.FormData,
  MutationObserver: browserWindow.MutationObserver,
});

const { createApp, createSSRApp, h, nextTick, ref } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const {
  CascadeListColumn,
  CascadeListItem,
  CascadeListRoot,
} = await import('../.verification-dist/cascade-list.js');

const initialNodes = [
  { id: 'asia', parentID: null },
  { id: 'europe', parentID: null },
  { id: 'korea', parentID: 'asia' },
  { id: 'japan', parentID: 'asia' },
  { id: 'seoul', parentID: 'korea' },
  { id: 'tokyo', parentID: 'japan' },
];

function renderColumns(state) {
  return state.columns.map((_, depth) => h(CascadeListColumn, {
    depth,
    label: `Level ${depth + 1}`,
  }, {
    default: ({ items }) => items.map((item) => h(CascadeListItem, { value: item }, {
      default: () => item,
    })),
  }));
}

async function settle() {
  await nextTick();
  await nextTick();
  await Promise.resolve();
}

test('Vue cascade list keeps controlled values external and leaves Escape to its host', async () => {
  const value = ref(null);
  const proposals = [];
  const { app, host } = mount(() => h(CascadeListRoot, {
    nodes: initialNodes,
    modelValue: value.value,
    label: 'Location',
    'onUpdate:modelValue': (next) => { proposals.push(next); },
  }, { default: renderColumns }));

  await settle();
  option(host, 'asia').click();
  await settle();
  option(host, 'korea').click();
  await settle();
  option(host, 'seoul').click();
  await settle();

  assert.deepEqual(proposals, ['seoul']);
  assert.equal(host.querySelector('[aria-selected="true"]'), null);
  assert.equal(host.querySelectorAll('[role="listbox"]').length, 3);

  value.value = 'seoul';
  await settle();
  assert.equal(option(host, 'seoul').getAttribute('aria-selected'), 'true');

  const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
  host.querySelector('[data-part="root"]').dispatchEvent(escape);
  assert.equal(escape.defaultPrevented, false);
  assert.equal(host.querySelectorAll('[role="listbox"]').length, 3);
  unmount(app, host);
});

test('Vue cascade list wires Home, End, Arrow keys, Enter, and Space through visible options', async () => {
  const changes = [];
  const { app, host } = mount(() => h(CascadeListRoot, {
    nodes: initialNodes,
    'onUpdate:modelValue': (next) => { changes.push(next); },
  }, { default: renderColumns }));
  await settle();
  const root = host.querySelector('[data-part="root"]');

  keydown(root, 'End');
  await settle();
  assert.equal(option(host, 'europe').tabIndex, 0);
  keydown(root, 'Home');
  await settle();
  assert.equal(option(host, 'asia').tabIndex, 0);
  keydown(root, 'ArrowRight');
  await settle();
  assert.equal(option(host, 'korea').tabIndex, 0);
  keydown(root, 'ArrowRight');
  await settle();
  assert.equal(option(host, 'seoul').tabIndex, 0);
  keydown(root, 'Enter');
  await settle();
  keydown(root, ' ');
  await settle();

  assert.deepEqual(changes, ['seoul']);
  assert.equal(option(host, 'seoul').getAttribute('aria-selected'), 'true');
  unmount(app, host);
});

test('Vue cascade list keeps disabled items visible and read-only values unchanged', async () => {
  const changes = [];
  const { app, host } = mount(() => h(CascadeListRoot, {
    nodes: initialNodes,
    defaultValue: 'seoul',
    disabledItems: ['europe'],
    readonly: true,
    'onUpdate:modelValue': (next) => { changes.push(next); },
  }, { default: renderColumns }));
  await settle();

  assert.equal(option(host, 'europe').getAttribute('aria-disabled'), 'true');
  assert.equal(option(host, 'europe').tabIndex, -1);
  option(host, 'japan').click();
  await settle();
  assert.deepEqual(changes, []);
  assert.equal(option(host, 'seoul').getAttribute('aria-selected'), 'true');
  assert.equal(host.querySelector('[data-part="root"]').getAttribute('aria-readonly'), 'true');
  unmount(app, host);
});

test('Vue cascade list reconciles removed controlled leaves and submits the remaining value', async () => {
  const nodes = ref(initialNodes);
  const value = ref('seoul');
  const { app, host } = mount(() => h('form', null, [
    h(CascadeListRoot, {
      nodes: nodes.value,
      modelValue: value.value,
      name: 'location',
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, { default: renderColumns }),
  ]));

  await settle();
  assert.equal(new FormData(host.querySelector('form')).get('location'), 'seoul');
  nodes.value = [
    { id: 'europe', parentID: null },
    { id: 'paris', parentID: 'europe' },
  ];
  await settle();

  assert.equal(value.value, null);
  assert.equal(new FormData(host.querySelector('form')).get('location'), '');
  assert.equal(host.querySelectorAll('[role="listbox"]').length, 1);
  assert.equal(option(host, 'europe').tabIndex, 0);
  assert.equal(host.querySelector('[data-sectile-cascade-list-id="seoul"]'), null);
  unmount(app, host);
});

test('Vue cascade list hydrates the same always-visible structure', async () => {
  const component = {
    render: () => h(CascadeListRoot, {
      nodes: initialNodes,
      defaultValue: 'seoul',
      label: 'Location',
      name: 'location',
    }, { default: renderColumns }),
  };
  const html = await renderToString(createSSRApp(component));
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const warnings = [];
  const app = createSSRApp(component);
  app.config.warnHandler = (message) => { warnings.push(message); };
  app.mount(host);
  await settle();

  assert.deepEqual(warnings, []);
  assert.equal(host.querySelectorAll('[role="listbox"]').length, 3);
  assert.equal(host.querySelector('select[name="location"]').value, 'seoul');
  unmount(app, host);
});

function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  return { app, host };
}

function option(host, value) {
  const element = host.querySelector(`[data-sectile-cascade-list-id="${value}"]`);
  assert.ok(element instanceof HTMLElement);
  return element;
}

function keydown(element, key) {
  element.dispatchEvent(new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  }));
}

function unmount(app, host) {
  app.unmount();
  host.remove();
}
