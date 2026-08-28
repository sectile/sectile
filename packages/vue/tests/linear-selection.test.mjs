import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '../.verification-dist/radio-group.js';
import { ToggleGroupItem, ToggleGroupRoot } from '../.verification-dist/toggle-group.js';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '../.verification-dist/tabs.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

test('Vue radio group projects persistent indicators and native form radios', async () => {
  const items = ['email', 'sms'];
  const app = createSSRApp({
    render: () => h(RadioGroupRoot, { items, defaultValue: 'email', name: 'channel' }, {
      default: () => items.map((value) => h(RadioGroupItem, { value }, {
        default: () => [value, h(RadioGroupIndicator, null, () => 'selected')],
      })),
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="radiogroup"/);
  assert.match(html, /role="radio"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /type="radio"/);
  assert.match(html, /name="channel"/);
  assert.match(html, /data-part="indicator"/);
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
