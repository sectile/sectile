import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, { window: browserWindow, document: browserWindow.document, Node: browserWindow.Node,
  Element: browserWindow.Element, HTMLElement: browserWindow.HTMLElement, SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event, MouseEvent: browserWindow.MouseEvent, KeyboardEvent: browserWindow.KeyboardEvent, MutationObserver: browserWindow.MutationObserver });
const { createApp, createSSRApp, h, nextTick, shallowRef, KeepAlive } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { CheckboxTreeRoot: Root, CheckboxTreeItem: Item, CheckboxTreeGroup: Group, CheckboxTreeDisclosure: Disclosure } = await import('../.verification-dist/checkbox-tree.js');
const { HostProvider } = await import('../.verification-dist/host-provider.js');
const nodes = [{ id: 'root', parentID: null }, { id: 'a', parentID: 'root' }, { id: 'b', parentID: 'root' }];
const rows = () => [h(Item, { value: 'root' }, { default: ({ checked }) => [String(checked), h(Disclosure, { for: 'root', as: 'button' }, () => 'Toggle root')] }),
  h(Group, { for: 'root' }, () => [h(Item, { value: 'a' }, () => 'A'), h(Item, { value: 'b' }, () => 'B')])];
const click = node => node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
const row = (host, id) => host.querySelector(`[data-sectile-checkbox-tree-item="${id}"]`);

test('Vue checkbox tree renders Core checked and disabled hierarchy during SSR', async () => {
  const html = await renderToString(createSSRApp({ render: () => h(Root, { nodes, defaultValue: ['a'], defaultExpandedValues: ['root'], disabledItems: ['b'], label: 'Folders' }, { default: rows }) }));
  assert.match(html, /role="tree"[^>]*aria-label="Folders"/u);
  assert.match(html, /data-sectile-checkbox-tree-item="root"[^>]*aria-level="1"[^>]*aria-checked="true"/u);
  assert.match(html, /data-sectile-checkbox-tree-item="b"[^>]*aria-checked="false"[^>]*aria-disabled="true"/u);
  assert.doesNotMatch(html, /aria-selected/u);
});

test('Vue checkbox tree preserves controlled proposals and aggregates unmounted leaves', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const value = shallowRef(['a']), proposals = [];
  const app = createApp({ render: () => h(Root, { nodes, modelValue: value.value, defaultExpandedValues: ['root'], label: 'Folders', 'onUpdate:modelValue': next => proposals.push(next) }, {
    default: () => h(Item, { value: 'root' }, ({ checked }) => String(checked)),
  }) });
  try {
    app.mount(host); await nextTick(); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed');
    click(row(host, 'root')); await nextTick(); assert.deepEqual(proposals, [['a', 'b']]);
    assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed');
    value.value = proposals[0]; await nextTick(); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'true');
  } finally { app.unmount(); host.remove(); }
});

test('Vue checkbox tree reconciles structural changes and restores focus to the accepted visible item', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const domain = shallowRef(nodes), value = shallowRef(['a']), expanded = shallowRef(['root']), highlighted = shallowRef('a');
  const app = createApp({ render: () => h(Root, { nodes: domain.value, modelValue: value.value, expandedValues: expanded.value, highlightedValue: highlighted.value,
    'onUpdate:modelValue': next => { value.value = next; }, 'onUpdate:expandedValues': next => { expanded.value = next; }, 'onUpdate:highlightedValue': next => { highlighted.value = next; },
  }, { default: () => domain.value.map(node => h(Item, { value: node.id, key: node.id }, () => node.id)) }) });
  try {
    app.mount(host); await nextTick(); row(host, 'a').focus();
    domain.value = [{ id: 'other', parentID: null }]; await nextTick(); await nextTick();
    assert.deepEqual(value.value, []); assert.deepEqual(expanded.value, []); assert.equal(highlighted.value, 'other');
    assert.equal(document.activeElement, row(host, 'other'));
  } finally { app.unmount(); host.remove(); }
});

test('Vue checkbox tree suspends Native listeners for Host/KeepAlive without reconstructing accepted input', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const active = shallowRef(true), visible = shallowRef(true); let reads = 0;
  const domain = nodes.map(node => ({ get id() { reads++; return node.id; }, parentID: node.parentID }));
  const listeners = new Map(), add = HTMLElement.prototype.addEventListener, remove = HTMLElement.prototype.removeEventListener;
  HTMLElement.prototype.addEventListener = function(type, listener, ...rest) {
    if ((type === 'keydown' || type === 'click') && this.dataset.scope === 'checkbox-tree' && this.dataset.part === 'root') { const set = listeners.get(this) ?? new Set(); set.add(listener); listeners.set(this, set); }
    return add.call(this, type, listener, ...rest);
  };
  HTMLElement.prototype.removeEventListener = function(type, listener, ...rest) { listeners.get(this)?.delete(listener); return remove.call(this, type, listener, ...rest); };
  const count = () => [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  const app = createApp({ render: () => h(HostProvider, { active: active.value }, () => h(KeepAlive, null, { default: () => visible.value ? h(Root, { nodes: domain, defaultExpandedValues: ['root'] }, { default: rows }) : null })) });
  try {
    app.mount(host); await nextTick(); assert.equal(count(), 2);
    click(row(host, 'a')); await nextTick(); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed');
    const before = reads;
    active.value = false; await nextTick(); assert.equal(count(), 0);
    click(row(host, 'root')); await nextTick();
    active.value = true; await nextTick(); assert.equal(count(), 2); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed');
    visible.value = false; await nextTick(); assert.equal(count(), 0);
    visible.value = true; await nextTick(); assert.equal(count(), 2); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed'); assert.equal(reads, before);
    app.unmount(); assert.equal(count(), 0);
  } finally { if (host.firstChild) app.unmount(); HTMLElement.prototype.addEventListener = add; HTMLElement.prototype.removeEventListener = remove; host.remove(); }
});

test('Vue checkbox tree reattaches a replaced root element without resetting checks or focus', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const as = shallowRef('section');
  const app = createApp({ render: () => h(Root, { nodes, as: as.value, defaultExpandedValues: ['root'], defaultValue: ['a'], defaultHighlightedValue: 'a' }, { default: rows }) });
  try {
    app.mount(host); await nextTick(); const old = host.querySelector('[data-part="root"]'); row(host, 'a').focus();
    as.value = 'div'; await nextTick(); await nextTick();
    assert.notEqual(host.querySelector('[data-part="root"]'), old); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'mixed');
    assert.equal(document.activeElement, row(host, 'a'));
    click(row(host, 'b')); await nextTick(); assert.equal(row(host, 'root').getAttribute('aria-checked'), 'true');
  } finally { app.unmount(); host.remove(); }
});
