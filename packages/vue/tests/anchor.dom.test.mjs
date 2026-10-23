import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'https://example.test/' });
for (const name of ['window', 'document', 'Element', 'HTMLElement', 'HTMLAnchorElement', 'SVGElement', 'Node', 'Event', 'MouseEvent']) {
  globalThis[name] = name === 'window' ? window : window[name];
}
const { createApp, createSSRApp, defineComponent, Fragment, h, nextTick, shallowRef } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { Anchor } = await import('../.verification-dist/primitive.js');

function mount(t, render) {
  const container = document.createElement('div'); document.body.append(container);
  const app = createApp({ render }); app.mount(container);
  let mounted = true;
  const unmount = () => { if (mounted) { mounted = false; app.unmount(); } };
  t.after(() => { unmount(); container.remove(); });
  return { app, unmount, container, anchor: () => container.querySelector('a') };
}
function dispatchClick(element, options = {}, type = 'click') {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...options });
  element.dispatchEvent(event); return event;
}
async function click(element, options = {}, type = 'click') {
  // Vue timestamps invokers to reject events predating listener attachment.
  // A synthetic event immediately after mount can share the attachment millisecond.
  await new Promise(resolve => setTimeout(resolve, 2));
  return dispatchClick(element, options, type);
}

test('Anchor SSR projects native destinations, relation, download and current without a wrapper', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Anchor,
    { href: '#docs', target: '_blank', rel: 'external', download: true, current: 'page' }, () => 'Docs') }));
  assert.match(html, /^<a /); assert.match(html, /href="#docs"/);
  assert.match(html, /rel="external noopener"/); assert.match(html, /download/);
  assert.match(html, /aria-current="page"/); assert.doesNotMatch(html, /role=|aria-disabled=/);
  await assert.rejects(renderToString(createSSRApp({ render: () => h(Anchor, null, () => 'Missing') })), /href/);
  const opaque = defineComponent({ render: () => h('a', { href: '#opaque' }, 'Opaque') });
  await assert.rejects(renderToString(createSSRApp({ render: () => h(Anchor, { asChild: true }, () => h(opaque)) })), /native a element/);
});

test('Anchor revokes adopted href and tab order before child navigation and restores unchanged input', async t => {
  const disabled = shallowRef(true), seen = [], exposed = shallowRef(null);
  const childProps = { href: '#child', tabindex: 3, 'aria-current': 'step',
    onClick: event => { seen.push('child'); event.preventDefault(); } };
  const fixture = mount(t, () => h(Anchor, { ref: exposed, asChild: true, disabled: disabled.value,
    onClick: () => seen.push('outer') }, () => h(Fragment, null, [h('a', childProps, 'Child')])));
  const element = fixture.anchor();
  assert.equal(exposed.value.element, element);
  assert.equal(element.getAttribute('href'), null); assert.equal(element.tabIndex, -1);
  assert.equal(element.getAttribute('role'), 'link'); assert.equal(element.getAttribute('aria-disabled'), 'true');
  assert.equal(element.getAttribute('aria-current'), 'step');
  assert.equal((await click(element)).defaultPrevented, true); assert.deepEqual(seen, []);
  assert.equal(childProps.href, '#child'); assert.equal(childProps.tabindex, 3);
  disabled.value = false; await nextTick();
  assert.equal(element.getAttribute('href'), '#child'); assert.equal(element.tabIndex, 3);
  assert.equal(element.getAttribute('aria-disabled'), null); assert.equal(element.getAttribute('role'), null);
  await click(element); assert.deepEqual(seen, ['outer', 'child']);
});

test('Anchor outer cancellation precedes child navigation and preserves the original event', async t => {
  let received, navigations = 0;
  const fixture = mount(t, () => h(Anchor, { asChild: true,
    onClick: event => { received = event; event.preventDefault(); } },
  () => h('a', { href: '#child', onClick: () => navigations++ }, 'Child')));
  const event = await click(fixture.anchor());
  assert.equal(received, event); assert.equal(navigations, 0); assert.equal(event.defaultPrevented, true);
});

for (const textChild of [false, true]) test(`Anchor supplementary slots preserve adopted ${textChild ? 'text' : 'element'} content, identity, activation and cleanup`, async t => {
  const disabled = shallowRef(false), label = shallowRef('Docs'), exposed = shallowRef(null), childRef = shallowRef(null);
  const events = [], states = [];
  let child;
  const fixture = mount(t, () => h(Anchor, { ref: exposed, asChild: true, disabled: disabled.value, current: 'page' }, {
    default: () => [h(Fragment, null, [child = h('a', { href: '#docs', ref: childRef,
      onClick: event => { events.push(event); event.preventDefault(); } }, textChild ? label.value : [h('strong', null, label.value)])])],
    leading: state => { states.push([state.disabled, state.current]); return h('span', { 'aria-hidden': 'true' }, '→'); },
    trailing: () => h('span', { 'aria-hidden': 'true' }, '↗'),
    content: state => { states.push([state.disabled, state.current]); return h('span', { 'data-content': '' }, state.children); },
  }));
  const element = fixture.anchor();
  assert.equal(fixture.container.querySelectorAll('a').length, 1);
  assert.equal(element.textContent, '→Docs↗');
  assert.equal(element.querySelector('[data-content]').textContent, 'Docs');
  if (textChild) assert.equal(child.children, 'Docs');
  else { assert.equal(child.children.length, 1); assert.equal(child.children[0].type, 'strong'); }
  assert.equal(exposed.value.element, element); assert.equal(childRef.value, element);
  exposed.value.focus(); assert.equal(document.activeElement, element);
  const event = await click(element); assert.deepEqual(events, [event]);
  label.value = 'Guide'; disabled.value = true; await nextTick();
  assert.equal(fixture.anchor(), element); assert.equal(element.textContent, '→Guide↗');
  assert.deepEqual(states.at(-1), [true, 'page']);
  assert.equal((await click(element)).defaultPrevented, true); assert.equal(events.length, 1);
  const saved = exposed.value;
  fixture.unmount(); assert.equal(saved.element, null); assert.equal(childRef.value, null);
  assert.equal((await click(element)).defaultPrevented, true); assert.equal(events.length, 1);
});

test('Anchor supplementary slots render the same ordered content during SSR without adoption', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Anchor, { href: '#docs', current: 'step' }, {
    leading: state => h('span', null, state.current), default: () => 'Docs', trailing: () => h('span', null, '↗'),
    content: state => h('span', { 'data-content': '' }, [state.children]),
  }) }));
  assert.match(html, /^<a [^>]*>.*<span>step<\/span>.*Docs.*<span>↗<\/span>.*<\/a>$/);
  const rendered = document.createElement('div'); rendered.innerHTML = html;
  assert.equal(rendered.querySelector('[data-content]').textContent, 'Docs');
});

test('Anchor deduplicates a forwarded callback and respects immediate cancellation and Vue errors', async t => {
  const seen = [], shared = () => seen.push('shared');
  const fixture = mount(t, () => h(Anchor, { asChild: true, onClick: shared }, () => h('a', {
    href: '#child', onClick: [shared, event => { seen.push('stop'); event.preventDefault(); event.stopImmediatePropagation(); }, () => seen.push('late')],
  }, 'Child')));
  await click(fixture.anchor()); assert.deepEqual(seen, ['shared', 'stop']);
  const errors = [], failure = new Error('listener failure');
  const errorContainer = document.createElement('div');
  const app = createApp({ render: () => h(Anchor, { href: '#error', onClick: [() => { throw failure; }, event => event.preventDefault()] }, () => 'Error') });
  app.config.errorHandler = error => errors.push(error); app.mount(errorContainer);
  t.after(() => app.unmount()); await click(errorContainer.querySelector('a'));
  assert.deepEqual(errors, [failure]);
});

test('Anchor once groups survive updates and rearm for listener registration or a new native root', async t => {
  const disabled = shallowRef(true), revision = shallowRef(0), key = shallowRef('a'), registered = shallowRef(true), seen = [];
  const fixture = mount(t, () => h(Anchor, { asChild: true, disabled: disabled.value,
    'data-revision': revision.value, onClickOnce: registered.value ? [() => seen.push('once1'), () => seen.push('once2')] : undefined },
  () => h('a', { key: key.value, href: '#once', onClick: event => event.preventDefault() }, 'Once')));
  await click(fixture.anchor()); assert.deepEqual(seen, []);
  disabled.value = false; await nextTick(); await click(fixture.anchor());
  assert.deepEqual(seen, ['once1', 'once2']);
  revision.value++; await nextTick(); await click(fixture.anchor());
  assert.deepEqual(seen, ['once1', 'once2']);
  registered.value = false; await nextTick(); registered.value = true; await nextTick();
  await click(fixture.anchor()); assert.deepEqual(seen, ['once1', 'once2', 'once1', 'once2']);
  const old = fixture.anchor(); key.value = 'b'; await nextTick();
  assert.notEqual(fixture.anchor(), old);
  assert.equal((await click(old)).defaultPrevented, true);
  await click(fixture.anchor()); assert.deepEqual(seen, ['once1', 'once2', 'once1', 'once2', 'once1', 'once2']);
});

test('Anchor once delivery consumes before reentrant dispatch and keeps child cancellation ordered', async t => {
  const seen = [];
  const fixture = mount(t, () => h(Anchor, { href: '#once', onClickOnce: [
    event => { seen.push('first'); dispatchClick(event.currentTarget); }, () => seen.push('second'),
  ], onClick: event => { seen.push('regular'); event.preventDefault(); } }, () => 'Once'));
  await click(fixture.anchor()); assert.deepEqual(seen, ['first', 'regular', 'second', 'regular']);
});

test('Anchor keeps native capture/passive/auxiliary lanes and native event data', async t => {
  const seen = [];
  const fixture = mount(t, () => h(Anchor, { asChild: true,
    onClickCapture: () => seen.push('outer-capture'),
    onClickPassive: event => { seen.push('outer-passive'); event.preventDefault(); assert.equal(event.defaultPrevented, false); },
    onAuxclick: event => { seen.push(`aux:${event.button}`); event.preventDefault(); },
  }, () => h('a', { href: '#lanes', target: '_blank', download: 'report.txt',
    onClickCapture: () => seen.push('child-capture'),
    onClick: event => { seen.push(`child:${event.ctrlKey}:${event.button}`); event.preventDefault(); },
  }, 'Lanes')));
  await click(fixture.anchor(), { ctrlKey: true });
  assert.deepEqual(seen, ['outer-capture', 'child-capture', 'outer-passive', 'child:true:0']);
  await click(fixture.anchor(), { button: 1 }, 'auxclick'); assert.equal(seen.at(-1), 'aux:1');
  assert.equal(fixture.anchor().target, '_blank'); assert.equal(fixture.anchor().download, 'report.txt');
});

test('Anchor merges adopted refs/classes once and releases exposed and retired roots', async t => {
  const refs = [], exposed = shallowRef(null), key = shallowRef('a');
  const fixture = mount(t, () => h(Anchor, { ref: exposed, asChild: true, class: 'outer', onClick: event => event.preventDefault() },
    () => h('a', { key: key.value, ref: value => refs.push(value), class: 'child', href: '#refs' }, 'Refs')));
  const first = fixture.anchor(), handle = exposed.value;
  assert.equal(handle.element, first); assert.equal(first.className, 'child outer');
  handle.focus(); assert.equal(document.activeElement, first);
  key.value = 'b'; await nextTick(); const second = fixture.anchor();
  assert.equal(handle.element, second); assert.ok(refs.includes(null)); assert.equal(refs.at(-1), second);
  fixture.unmount(); assert.equal(handle.element, null);
  assert.equal((await click(second)).defaultPrevented, true);
});

test('Anchor explicit undefined clears adopted attributes instead of restoring child authority', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Anchor,
    { asChild: true, disabled: true, href: undefined, current: undefined, target: undefined, download: undefined },
    () => h('a', { href: '#child', target: '_blank', download: true, 'aria-current': 'page' }, 'Child')) }));
  assert.doesNotMatch(html, /href=|target=|download|aria-current=/);
  assert.match(html, /aria-disabled="true"/);
});
