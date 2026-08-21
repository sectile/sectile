import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createCarousel as createDOMCarousel } from '@sectile/dom/carousel';
import { createFeed as createDOMFeed } from '@sectile/dom/feed';
import { createGridControl as createDOMGrid } from '@sectile/dom/grid';
import { createCarousel as createTerminalCarousel } from '@sectile/terminal/carousel';
import { createFeed as createTerminalFeed } from '@sectile/terminal/feed';
import { createGridControl as createTerminalGrid } from '@sectile/terminal/grid';

test('DOM and terminal grids preserve navigation, disabled, selection, and edit traces', () => {
  const options = { rows: [['a', 'b', 'c'], ['d', null, 'e']], defaultHighlightedValue: 'a', disabledItems: ['b'], policies: { boundary: 'wrap-axis' } };
  const DOM = unwrap(createDOMGrid({ ...options, root: new FakeElement() }));
  const terminal = unwrap(createTerminalGrid(options));
  assertTrace(DOM, terminal, ['right', 'down', 'select', 'start-edit', 'cancel-edit', { type: 'focus', id: 'd' }]);
});

test('DOM and terminal carousels preserve boundaries, pause state, and controlled sync', () => {
  for (const controlled of [false, true]) {
    const options = { slides: ['a', 'b', 'c'], policies: { wrap: false }, ...(controlled ? { value: 'a', paused: false } : { defaultValue: 'a', defaultPaused: false }) };
    const DOM = unwrap(createDOMCarousel({ ...options, root: new FakeElement() }));
    const terminal = unwrap(createTerminalCarousel(options));
    assertTrace(DOM, terminal, ['previous', 'next', 'last', 'next', 'toggle-pause', { type: 'pause-for', reason: 'hover' }, { type: 'resume-for', reason: 'hover' }]);
    assert.deepEqual(DOM.getPosition(), terminal.getPosition());
    if (controlled) {
      assert.deepEqual(DOM.syncControlledValues({ value: 'c', paused: true }), terminal.syncControlledValues({ value: 'c', paused: true }));
      assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
    }
  }
});

test('DOM and terminal feeds preserve revisioned request and window traces', () => {
  const requests = { DOM: [], terminal: [] };
  const DOM = unwrap(createDOMFeed({ root: new FakeElement(), items: ['a', 'b'], revision: 1, onRequestWindow: (...request) => requests.DOM.push(request) }));
  const terminal = unwrap(createTerminalFeed({ items: ['a', 'b'], revision: 1, onRequestWindow: (...request) => requests.terminal.push(request) }));
  assertTrace(DOM, terminal, ['next', 'request-after']);
  assert.deepEqual(requests.DOM, requests.terminal);
  assert.deepEqual(DOM.syncWindow({ items: ['b', 'c'], revision: 2, highlightedValue: 'b' }), terminal.syncWindow({ items: ['b', 'c'], revision: 2, highlightedValue: 'b' }));
  assertTrace(DOM, terminal, ['next', 'request-before', 'clear-request']);
});

function assertTrace(DOM, terminal, events) {
  assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  for (const event of events) {
    assert.equal(DOM.handleEvent(event), terminal.handleEvent(event));
    assert.deepEqual(DOM.getSnapshot(), terminal.getSnapshot());
  }
}

class FakeElement {
  attributes = new Map(); listeners = new Map(); tabIndex = -1;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() {}
}
