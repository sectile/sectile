import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import {
  Comment,
  Fragment,
  Text,
  createSSRApp,
  defineComponent,
  h,
  nextTick,
  ref,
} from 'vue';
import { Primitive, renderPrimitive } from '../dist/primitive.js';
import { createHostNode, createTestRenderer } from './renderer.mjs';

test('Primitive adopts an element forwarded through a named slot', async () => {
  const NamedSlotForwarder = defineComponent({
    inheritAttrs: false,
    setup(_props, { attrs, slots }) {
      return () => h(Primitive, { ...attrs, asChild: true }, { default: slots['trigger'] });
    },
  });
  const app = createSSRApp({
    render: () => h(NamedSlotForwarder, { role: 'button', 'data-adopted': '' }, {
      trigger: () => h(Fragment, { key: 'named' }, [
        h(Comment),
        h('a', { href: '/docs' }, 'Documentation'),
      ]),
    }),
  });

  const html = await renderToString(app);
  assert.equal((html.match(/<a /g) ?? []).length, 1);
  assert.match(html, /role="button"/);
  assert.match(html, /data-adopted/);
  assert.match(html, /href="\/docs"/);
});

test('Primitive path-copies nested fragments and preserves block and scope metadata', () => {
  const leaf = h('button', { class: 'consumer' }, 'Adopted');
  leaf.scopeId = 'data-v-consumer';
  const inner = h(Fragment, { key: 'inner' }, [h(Comment), leaf]);
  inner.slotScopeIds = ['data-v-owner-s'];
  inner.dynamicChildren = [leaf];
  const outer = h(Fragment, { key: 'outer' }, [h(Comment), inner, h(Comment)]);
  outer.dynamicChildren = [leaf];
  const originalOuterChildren = outer.children;
  const originalInnerChildren = inner.children;

  const adopted = renderPrimitive(
    { as: 'div', asChild: true },
    { role: 'checkbox', class: 'sectile' },
    { default: () => [outer] },
  );

  assert.equal(adopted.type, Fragment);
  assert.equal(adopted.key, 'outer');
  assert.notEqual(adopted, outer);
  assert.equal(outer.children, originalOuterChildren);
  assert.equal(inner.children, originalInnerChildren);
  const adoptedInner = adopted.children[1];
  const adoptedLeaf = adoptedInner.children[1];
  assert.notEqual(adoptedInner, inner);
  assert.notEqual(adoptedLeaf, leaf);
  assert.equal(adoptedInner.key, 'inner');
  assert.deepEqual(adoptedInner.slotScopeIds, ['data-v-owner-s']);
  assert.equal(adoptedLeaf.scopeId, 'data-v-consumer');
  assert.equal(adoptedLeaf.props.role, 'checkbox');
  assert.equal(adoptedLeaf.props.class, 'consumer sectile');
  assert.equal(adoptedInner.dynamicChildren[0], adoptedLeaf);
  assert.equal(adopted.dynamicChildren[0], adoptedLeaf);
});

test('Primitive ignores comments and whitespace while rejecting ambiguous slot content', () => {
  const comment = h(Comment, null, 'compiler marker');
  const whitespace = h(Text, null, ' \n ');
  const button = h('button', null, 'Only');
  const adopted = renderPrimitive(
    { as: 'div', asChild: true },
    { role: 'button' },
    { default: () => [comment, whitespace, button] },
  );
  assert.equal(adopted.length, 3);
  assert.equal(adopted[0], comment);
  assert.equal(adopted[1], whitespace);
  assert.equal(adopted[2].props.role, 'button');

  assert.throws(() => renderPrimitive(
    { as: 'div', asChild: true },
    {},
    { default: () => [] },
  ), /requires exactly one element child; received 0/);
  assert.throws(() => renderPrimitive(
    { as: 'div', asChild: true },
    {},
    { default: () => [h('button'), h(Fragment, null, [h('a')])] },
  ), /requires exactly one element child; received 2/);
  assert.throws(() => renderPrimitive(
    { as: 'div', asChild: true },
    {},
    { default: () => [h(Text, null, 'visible text'), h('button')] },
  ), /unsupported non-element node/);
});

test('Primitive composes props, listeners, and both refs exactly once', () => {
  const renderer = createTestRenderer();
  const childRefs = [];
  const sectileRefs = [];
  let childClicks = 0;
  let sectileClicks = 0;
  let prevent = false;
  const app = renderer.createApp({
    render: () => h(Primitive, {
      asChild: true,
      class: 'sectile',
      style: { display: 'block' },
      elementRef: (element) => { sectileRefs.push(element); },
      onClick: () => { sectileClicks += 1; },
    }, {
      default: () => h('button', {
        ref: (element) => { childRefs.push(element); },
        class: 'consumer',
        style: { color: 'red' },
        onClick: (event) => {
          childClicks += 1;
          if (prevent) event.preventDefault();
        },
      }, 'Adopted'),
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  const button = container.children[0];

  assert.equal(button.props.class, 'consumer sectile');
  assert.deepEqual(button.props.style, { color: 'red', display: 'block' });
  assert.equal(childRefs[0], button);
  assert.equal(sectileRefs[0], button);
  invokeHandlers(button.props.onClick, createEvent());
  assert.equal(childClicks, 1);
  assert.equal(sectileClicks, 1);

  prevent = true;
  invokeHandlers(button.props.onClick, createEvent());
  assert.equal(childClicks, 2);
  assert.equal(sectileClicks, 1);
  app.unmount();
});

test('Primitive keeps adoption attached when a dynamic slot replaces its root', async () => {
  const renderer = createTestRenderer();
  const button = ref(true);
  const app = renderer.createApp({
    render: () => h(Primitive, { asChild: true, role: 'switch', 'data-adopted': '' }, {
      default: () => h(Fragment, { key: 'dynamic' }, [
        h(Comment),
        button.value ? h('button', { key: 'button' }, 'Button') : h('a', { key: 'link' }, 'Link'),
      ]),
    }),
  });
  const container = createHostNode('root');
  app.mount(container);
  assert.equal(findHostNode(container, 'button').props.role, 'switch');

  button.value = false;
  await nextTick();
  assert.equal(findHostNode(container, 'button'), undefined);
  assert.equal(findHostNode(container, 'a').props.role, 'switch');
  assert.equal(findHostNode(container, 'a').props['data-adopted'], '');
  app.unmount();
});

function invokeHandlers(value, event) {
  for (const handler of Array.isArray(value) ? value : [value]) handler(event);
}

function createEvent() {
  return {
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
}

function findHostNode(node, type) {
  if (node.type === type) return node;
  for (const child of node.children) {
    const found = findHostNode(child, type);
    if (found !== undefined) return found;
  }
  return undefined;
}
