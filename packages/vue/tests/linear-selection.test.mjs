import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '../.verification-dist/radio-group.js';
import { ToggleGroupItem, ToggleGroupRoot } from '../.verification-dist/toggle-group.js';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../.verification-dist/tabs.js';
import { createTabsIDCache } from '../.verification-dist/internal/tabs-context.js';
import { createSequence } from '@sectile/core/sequence';
import { createTestWindow } from './happy-dom.mjs';
import { createHostNode, createTestRenderer } from './renderer.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/' });
test('Tabs ID retention follows the current canonical domain and releases its source on disposal', () => {
  let domain = createSequence(['a', 'b']), reads = 0;
  const identities = createTabsIDCache('bounded', () => { reads++; return domain; });
  const a = identities.get('a'); assert.equal(identities.get('a'), a);
  domain = createSequence(['b', 'a']); identities.reconcile(); assert.equal(identities.get('a'), a);
  const unknown = identities.get('outside'); assert.equal(identities.retained, 1);
  const observedReads = reads; void identities.retained; assert.equal(reads, observedReads);
  domain = createSequence(['outside']); identities.reconcile();
  assert.deepEqual(identities.get('outside'), unknown); assert.equal(identities.retained, 1);
  for (let epoch = 0; epoch < 40; epoch++) {
    const ids = Array.from({ length: 32 }, (_, index) => epoch + ':' + index);
    domain = createSequence(ids); identities.reconcile(); assert.equal(identities.retained, 0);
    for (const id of ids) identities.get(id);
    for (let index = 0; index < 32; index++) identities.get('unadmitted:' + index);
    assert.equal(identities.retained, ids.length);
  }
  domain = createSequence([]); identities.reconcile(); assert.equal(identities.retained, 0);
  domain = createSequence(['last']); identities.get('last'); identities.dispose(); const finalReads = reads;
  assert.equal(identities.retained, 0); assert.throws(() => identities.get('last'), /disposed/);
  assert.equal(reads, finalReads); identities.dispose();
});

for (const [Root, Item, key, datasetKey, multiple] of [
  [ToggleGroupRoot, ToggleGroupItem, 'data-toggle-group-id', 'toggleGroupId', true],
  [RadioGroupRoot, RadioGroupItem, 'data-radio-group-id', 'radioGroupId', false],
]) test(`${Root.name} keyboard focus reaches the item carrying the projected host identity`, async () => {
  const renderer = createTestRenderer(), items = ['left edge', 'وسط: center'];
  const app = renderer.createApp({ render: () => h(Root, { items, orientation: 'horizontal', defaultValue: multiple ? [items[0]] : items[0] }, {
    default: () => items.map(value => h(Item, { value }, () => value)),
  }) });
  const container = createHostNode('root'); app.mount(container);
  try {
    const root = container.children[0]; let focused = null;
    root.querySelectorAll = () => root.children.map((item, index) => ({ dataset: { [datasetKey]: item.props[key] }, closest: () => root, focus() { focused = items[index]; } }));
    root.props.onKeydown({ key: 'ArrowRight', target: root, currentTarget: root, defaultPrevented: false, preventDefault() {} });
    await nextTick(); await nextTick();
    assert.equal(focused, 'وسط: center');
  } finally { app.unmount(); }
});

test('Vue radio group projects persistent indicators and native form radios', async () => {
  const items = ['email', 'sms'];
  const app = createSSRApp({
    render: () => h(RadioGroupRoot, { items, defaultValue: 'email', name: 'channel', 'aria-label': 'Notification channel' }, {
      default: () => items.map((value) => h(RadioGroupItem, { value }, {
        default: () => [value, h(RadioGroupIndicator, null, () => 'selected')],
      })),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /aria-label="Notification channel"/);
  assert.match(html, /role="radio"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /type="radio"/);
  assert.match(html, /name="channel"/);
  assert.match(html, /data-part="indicator"/);
});

test('Vue radio group SSR preserves distinct numeric and textual host identities', async () => {
  const items = [1, '1'];
  const app = createSSRApp({
    render: () => h(RadioGroupRoot, { items, defaultValue: 1 }, {
      default: () => items.map((value) => h(RadioGroupItem, { value }, () => String(value))),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /data-radio-group-id="n:1"/);
  assert.match(html, /data-radio-group-id="s:1"/);
});

test('Vue radio group follows controlled selection', async () => {
  const renderer = createTestRenderer();
  const value = ref('email');
  const app = renderer.createApp({
    render: () => h(RadioGroupRoot, { items: ['email', 'sms'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; } }, {
      default: () => ['email', 'sms'].map((entry) => h(RadioGroupItem, { value: entry }, () => entry)),
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  root.children[1].props.onClick({ defaultPrevented: false, currentTarget: { closest: () => undefined } });
  await nextTick();
  assert.equal(value.value, 'sms');
  assert.equal(root.children[1].props['aria-checked'], 'true');
});

test('Vue toggle group exposes headless pressed buttons and controlled values', async () => {
  const renderer = createTestRenderer();
  const value = ref(['bold']);
  const app = renderer.createApp({
    render: () => h(ToggleGroupRoot, { items: ['bold', 'italic'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; } }, {
      default: () => ['bold', 'italic'].map((entry) => h(ToggleGroupItem, { value: entry }, () => entry)),
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  assert.equal(root.children[0].props['aria-pressed'], 'true');
  root.children[0].props.onClick({ defaultPrevented: false, currentTarget: { closest: () => undefined } });
  await nextTick();
  assert.deepEqual(value.value, []);
  assert.equal(root.children[0].props['aria-pressed'], 'false');
});

test('Vue tabs link triggers to persistent panels', async () => {
  const items = ['overview', 'settings'];
  const app = createSSRApp({
    render: () => h(TabsRoot, { items, defaultValue: 'overview' }, {
      default: () => [
        h(TabsList, null, { default: () => items.map((value) => h(TabsTrigger, { value }, () => value)) }),
        ...items.map((value) => h(TabsContent, { value }, () => `${value} panel`)),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-controls="sectile-tabs-/);
  assert.match(html, /role="tabpanel"/);
  assert.match(html, /hidden/);
});

test('Vue tabs generated IDs preserve exact values and link each trigger to its panel', async () => {
  const items = ['%', '-25', '/', '-2F', 'a%b', 'a-25b', 'é', 'e\u0301'];
  const app = createSSRApp({
    render: () => h(TabsRoot, { items, defaultValue: items[0] }, {
      default: () => [
        h(TabsList, null, { default: () => items.map((value) => h(TabsTrigger, { value }, () => value)) }),
        ...items.map((value) => h(TabsContent, { value }, () => `${value} panel`)),
      ],
    }),
  });
  const html = await renderToString(app);
  browserWindow.document.body.innerHTML = html;
  const triggers = [...browserWindow.document.querySelectorAll('[role="tab"]')];
  const panels = [...browserWindow.document.querySelectorAll('[role="tabpanel"]')];
  const elementIDs = [...triggers, ...panels].map((element) => element.id);
  assert.equal(triggers.length, items.length);
  assert.equal(panels.length, items.length);
  assert.equal(new Set(elementIDs).size, elementIDs.length);
  for (let index = 0; index < items.length; index += 1) {
    assert.equal(triggers[index]?.getAttribute('aria-controls'), panels[index]?.id);
    assert.equal(panels[index]?.getAttribute('aria-labelledby'), triggers[index]?.id);
  }
});

test('Vue tabs changes controlled panels without removing them', async () => {
  const renderer = createTestRenderer();
  const value = ref('overview');
  const app = renderer.createApp({
    render: () => h(TabsRoot, { items: ['overview', 'settings'], modelValue: value.value, 'onUpdate:modelValue': (next) => { value.value = next; } }, {
      default: () => [
        h(TabsList, null, { default: () => ['overview', 'settings'].map((entry) => h(TabsTrigger, { value: entry }, () => entry)) }),
        h(TabsContent, { value: 'overview' }, () => 'overview panel'),
        h(TabsContent, { value: 'settings' }, () => 'settings panel'),
      ],
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  const list = root.children[0];
  list.children[1].props.onClick({ defaultPrevented: false, currentTarget: { closest: () => undefined } });
  await nextTick();
  assert.equal(value.value, 'settings');
  assert.equal(root.children[1].props.hidden, true);
  assert.equal(root.children[2].props.hidden, false);
});
