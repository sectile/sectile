import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeList as createDOMCascadeList } from '../../packages/dom/dist/cascade-list.js';
import { createCascadeList as createTerminalCascadeList } from '../../packages/terminal/dist/cascade-list.js';

const nodes = [
  { id: 'root-a', parentID: null }, { id: 'root-b', parentID: null },
  { id: 'a-1', parentID: 'root-a' }, { id: 'a-2', parentID: 'root-a' },
  { id: 'a-1-x', parentID: 'a-1' }, { id: 'a-1-y', parentID: 'a-1' },
  { id: 'b-1', parentID: 'root-b' },
];

test('DOM and terminal CascadeList projections produce equivalent semantic traces', () => {
  const root = new FakeElement();
  const DOMList = createDOMCascadeList({ root, nodes, defaultHighlightedValue: 'root-a' });
  const terminalList = createTerminalCascadeList({ nodes, defaultHighlightedValue: 'root-a' });
  const events = [
    'right',
    'next',
    'previous',
    { type: 'select', id: 'a-1' },
    'last',
    'select',
    'left',
    'first',
  ];
  for (const event of events) {
    assert.equal(DOMList.handleEvent(event), terminalList.handleEvent(event));
    assert.deepEqual(observe(DOMList), observe(terminalList));
  }
  DOMList.disconnect();
});

test('DOM and terminal CascadeList projections preserve disabled and controlled parity', () => {
  const DOMValues = [];
  const terminalValues = [];
  const DOMList = createDOMCascadeList({
    root: new FakeElement(),
    nodes,
    disabledItems: ['root-b'],
    value: null,
    defaultHighlightedValue: 'root-a',
    onValueChange: (value) => DOMValues.push(value),
  });
  const terminalList = createTerminalCascadeList({
    nodes,
    disabledItems: ['root-b'],
    value: null,
    defaultHighlightedValue: 'root-a',
    onValueChange: (value) => terminalValues.push(value),
  });
  for (const event of ['next', 'right', 'select', 'select']) {
    assert.equal(DOMList.handleEvent(event), terminalList.handleEvent(event));
    assert.deepEqual(observe(DOMList), observe(terminalList));
  }
  assert.deepEqual(DOMValues, terminalValues);
  assert.deepEqual(DOMValues, ['a-1-x']);
  assert.equal(DOMList.syncControlledValues({ value: 'a-1-x' }).ok, true);
  assert.equal(terminalList.syncControlledValues({ value: 'a-1-x' }).ok, true);
  assert.deepEqual(observe(DOMList), observe(terminalList));
  DOMList.disconnect();
});

function observe(connection) {
  const snapshot = connection.getSnapshot();
  return {
    revision: snapshot.revision,
    value: snapshot.state.value,
    highlighted: snapshot.state.highlighted,
    path: snapshot.state.path,
    columns: connection.getColumns(),
    valuePath: connection.getValuePath(),
  };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  querySelectorAll() { return []; }
}
