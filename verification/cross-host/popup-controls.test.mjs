import assert from 'node:assert/strict';
import test from 'node:test';
import { createDialog as createDOMDialog } from '@sectile/dom/dialog';
import { createAlertDialog as createDOMAlertDialog } from '@sectile/dom/alert-dialog';
import { createTooltip as createDOMTooltip } from '@sectile/dom/tooltip';
import { createDialog as createTerminalDialog } from '@sectile/terminal/dialog';
import { createAlertDialog as createTerminalAlertDialog } from '@sectile/terminal/alert-dialog';
import { createTooltip as createTerminalTooltip } from '@sectile/terminal/tooltip';

test('DOM and terminal popups preserve open-state traces and controlled reconciliation', () => {
  const factories = [
    [createDOMDialog, createTerminalDialog],
    [createDOMAlertDialog, createTerminalAlertDialog],
    [createDOMTooltip, createTerminalTooltip],
  ];
  for (const [createDOM, createTerminal] of factories) {
    const DOM = createDOM({ root: new FakeElement(), open: false, autoFocus: false });
    const terminal = createTerminal({ open: false });
    assertTrace(DOM, terminal, ['open', 'toggle', 'close']);
    assert.deepEqual(DOM.syncControlledValue(true), terminal.syncControlledValue(true));
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
});

test('DOM and terminal alert dialogs deliver equivalent semantic obligations', () => {
  const DOMCommands = [];
  const terminalCommands = [];
  const DOM = createDOMAlertDialog({
    root: new FakeElement(), autoFocus: false, restoreFocus: false,
    onInitialFocus: () => DOMCommands.push('focus'),
    onFocusRestore: () => DOMCommands.push('restore'),
    onAnnounce: () => DOMCommands.push('announce'),
  });
  const terminal = createTerminalAlertDialog({
    onInitialFocus: () => terminalCommands.push('focus'),
    onFocusRestore: () => terminalCommands.push('restore'),
    onAnnounce: () => terminalCommands.push('announce'),
  });
  assertTrace(DOM, terminal, ['open', 'close']);
  assert.deepEqual(DOMCommands, terminalCommands);
});

function assertTrace(DOM, terminal, events) {
  assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  for (const event of events) {
    DOM.handleEvent(event);
    terminal.handleEvent(event);
    assert.deepEqual(observe(DOM.getSnapshot()), observe(terminal.getSnapshot()));
  }
}

function observe(snapshot) { return JSON.parse(JSON.stringify(snapshot)); }
class FakeElement {
  attributes = new Map(); listeners = new Map(); hidden = false; id = ''; tabIndex = -1;
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  querySelectorAll() { return []; }
  focus() {}
}
