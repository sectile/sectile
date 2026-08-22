import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick, ref } from 'vue';
import { SwitchRoot, SwitchThumb } from '../dist/switch.js';
import { ToggleButton } from '../dist/toggle-button.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

test('Vue switch renders persistent thumb semantics and native form state', async () => {
  const app = createSSRApp({
    render: () => h(SwitchRoot, {
      defaultValue: true,
      name: 'notifications',
      value: 'enabled',
      required: true,
    }, {
      default: () => ['Notifications', h(SwitchThumb, { class: 'thumb' })],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /role="switch"/);
  assert.match(html, /aria-checked="true"/);
  assert.match(html, /data-scope="switch"/);
  assert.match(html, /data-part="thumb"/);
  assert.match(html, /name="notifications"/);
  assert.match(html, /value="enabled"/);
});

test('Vue switch follows controlled v-model ownership', async () => {
  const renderer = createTestRenderer();
  const value = ref(false);
  const app = renderer.createApp({
    render: () => h(SwitchRoot, {
      modelValue: value.value,
      'onUpdate:modelValue': (next) => { value.value = next; },
    }, () => 'Notifications'),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children[0];
  button.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(value.value, true);
  assert.equal(button.props['aria-checked'], 'true');
});

test('Vue toggle button exposes pressed state and read-only interaction', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(ToggleButton, { defaultValue: true, readonly: true }, {
      default: ({ pressed }) => pressed ? 'Bold on' : 'Bold off',
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children[0];
  assert.equal(button.props['aria-pressed'], 'true');
  assert.equal(button.props['data-readonly'], '');
  button.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(button.props['aria-pressed'], 'true');
});
