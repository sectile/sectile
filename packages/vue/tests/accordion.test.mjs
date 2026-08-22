import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h, nextTick } from 'vue';
import {
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '../dist/accordion.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

const items = ['general', 'deployment'];

function accordionChildren() {
  return items.map((value) => h(AccordionItem, { value }, {
    default: () => [
      h(AccordionHeader, null, {
        default: () => h(AccordionTrigger, null, () => value),
      }),
      h(AccordionContent, null, () => `${value} content`),
    ],
  }));
}

test('Vue accordion renders native triggers and persistent linked content', async () => {
  const app = createSSRApp({
    render: () => h(AccordionRoot, {
      items,
      defaultValue: 'general',
    }, { default: accordionChildren }),
  });
  const html = await renderToString(app);
  assert.match(html, /<button/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-controls="sectile-accordion-panel-/);
  assert.match(html, /role="region"/);
  assert.match(html, /hidden/);
  assert.match(html, /data-part="content"/);
});

test('Vue accordion owns single expansion without removing content DOM', async () => {
  const renderer = createTestRenderer();
  const app = renderer.createApp({
    render: () => h(AccordionRoot, {
      items,
      defaultValue: 'general',
    }, { default: accordionChildren }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const root = container.children[0];
  const firstItem = root.children[0];
  const secondItem = root.children[1];
  const firstTrigger = firstItem.children[0].children[0];
  const secondTrigger = secondItem.children[0].children[0];
  const firstContent = firstItem.children[1];
  const secondContent = secondItem.children[1];
  assert.equal(firstTrigger.props['aria-expanded'], 'true');
  assert.equal(firstContent.props.hidden, false);
  assert.equal(secondContent.props.hidden, true);
  secondTrigger.props.onClick({ defaultPrevented: false });
  await nextTick();
  assert.equal(firstTrigger.props['aria-expanded'], 'false');
  assert.equal(secondTrigger.props['aria-expanded'], 'true');
  assert.equal(firstContent.props.hidden, true);
  assert.equal(secondContent.props.hidden, false);
});
