import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick } from 'vue';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '../dist/disclosure.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

test('Vue disclosure renders native trigger linkage and persistent content', async () => {
  const app = createSSRApp({
    render: () => h(DisclosureRoot, { defaultValue: false, contentId: 'advanced' }, {
      default: () => [
        h(DisclosureTrigger, null, () => 'Advanced options'),
        h(DisclosureContent, null, () => 'Configuration'),
      ],
    }),
  });
  const html = await renderToString(app);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="advanced"/);
  assert.match(html, /id="advanced"/);
  assert.match(html, /hidden/);
  assert.match(html, /data-part="content"/);
});

test('Vue disclosure owns uncontrolled open state and respects readonly', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(DisclosureRoot, { readonly: true }, {
      default: () => [
        h(DisclosureTrigger, null, () => 'Advanced'),
        h(DisclosureContent, null, () => 'Configuration'),
      ],
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  const trigger = root.children.find((child) => child.type === 'button');
  const content = root.children.find((child) => child.type === 'div');
  trigger.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(trigger.props['aria-expanded'], 'false');
  assert.equal(content.props.hidden, true);
});
