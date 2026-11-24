import assert from 'node:assert/strict'; import test from 'node:test'; import { unwrap } from '@sectile/core/result'; import { createFeed } from '../.verification-dist/feed.js'; test('DOM feed separates window requests from revision synchronization', () => { const root = new FakeElement(); let request = null; const changes = []; const feed = createFeed({ root, items: ['a', 'b'], revision: 1, setSize: 3, getPosition: (id) => ({ a: 1, b: 2, c: 3 })[id], onHighlightedValueChange: (value) => changes.push(value), onRequestWindow: (...args) => { request = args; } }); const a = new FakeElement(); const b = new FakeElement(); const c = new FakeElement(); feed.setItemAttributes(a, 'a'); feed.setItemAttributes(b, 'b'); b.dispatch('click'); assert.equal(b.focused, true); assert.deepEqual(changes, ['b']); feed.handleEvent('request-after'); assert.deepEqual(request, ['after', 'b', 1, 1]); unwrap(feed.syncWindow({ items: ['b', 'c'], revision: 2, requestGeneration: 1, highlightedValue: 'b' })); feed.setItemAttributes(c, 'c'); assert.equal(feed.getSnapshot().state.revision, 2); assert.equal(feed.getSnapshot().state.pending, null); assert.equal(c.attributes.get('aria-posinset'), '3'); assert.equal(a.listeners.get('click')?.size ?? 0, 0); a.attributes.set('aria-current', 'detached'); feed.handleEvent({ type: 'focus', id: 'c' }); assert.equal(a.attributes.get('aria-current'), 'detached'); feed.disconnect(); assert.equal(b.listeners.get('click')?.size ?? 0, 0); assert.equal(c.listeners.get('click')?.size ?? 0, 0); }); class FakeElement { attributes = new Map(); listeners = new Map(); focused = false; setAttribute(n, v) { this.attributes.set(n, v); } focus() { this.focused = true; } addEventListener(t, l) { const s = this.listeners.get(t) ?? new Set(); s.add(l); this.listeners.set(t, s); } removeEventListener(t, l) { this.listeners.get(t)?.delete(l); } dispatch(type) { for (const listener of this.listeners.get(type) ?? []) listener({}); } }
test('accepted earlier windows restore a retained anchor after projection', () => {
  const root = new FakeElement();
  const anchor = new FakeElement();
  let top = 20;
  anchor.getBoundingClientRect = () => ({ top });
  const scrollport = { scrollTop: 100, contains: node => node === anchor, getBoundingClientRect: () => ({ top: 0 }) };
  const feed = createFeed({ root, items: ['a', 'b'], scrollport, defaultHighlightedValue: 'b' });
  try {
    feed.setItemAttributes(anchor, 'b');
    feed.handleEvent('request-before');
    unwrap(feed.syncWindow({ items: ['early', 'a', 'b'], revision: 1, requestGeneration: 1 }));
    top = 68;
    feed.restoreScrollAnchor();
    assert.equal(scrollport.scrollTop, 148);
    feed.restoreScrollAnchor();
    assert.equal(scrollport.scrollTop, 148);
    feed.handleEvent('request-before');
    unwrap(feed.syncWindow({ items: ['earliest', 'early', 'a', 'b'], revision: 2, requestGeneration: 2 }));
    top = 116;
    scrollport.scrollTop = 196;
    feed.restoreScrollAnchor();
    assert.equal(scrollport.scrollTop, 196);
  } finally { feed.disconnect(); }
});

test('feed compensation converts scaled viewport distance to local scroll distance', () => {
  const root = new FakeElement(), anchor = new FakeElement();
  let top = 16;
  anchor.getBoundingClientRect = () => ({ top });
  const scrollport = {
    scrollTop: 100, contains: node => node === anchor, getBoundingClientRect: () => ({ top: 0 }),
    getRootNode: () => ({}), ownerDocument: { defaultView: { getComputedStyle: () => ({ scale: '0.8' }) } },
  };
  const feed = createFeed({ root, items: ['a'], scrollport });
  try {
    feed.setItemAttributes(anchor, 'a');
    feed.handleEvent('request-before');
    unwrap(feed.syncWindow({ items: ['early', 'a'], revision: 1, requestGeneration: 1 }));
    top = 56;
    feed.restoreScrollAnchor();
    assert.equal(scrollport.scrollTop, 150);
  } finally { feed.disconnect(); }
});
