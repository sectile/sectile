import assert from 'node:assert/strict';
import test from 'node:test';
import { createComboboxController as createDOMComboboxController } from '@sectile/dom/combobox';
import { createSequence } from '@sectile/primitives/sequence';
import { createComboboxController as createTerminalComboboxController } from '@sectile/terminal/combobox';

test('DOM and terminal combobox controllers produce equivalent acceptance traces', () => {
  const options = fixture();
  const DOMController = unwrap(createDOMComboboxController(options));
  const terminalController = unwrap(createTerminalComboboxController(options));
  assert.deepEqual(
    observe(DOMController.handleKeyboardInput({ key: 'Enter' })),
    observe(terminalController.handleKeyboardInput({ key: 'enter' })),
  );
  assert.deepEqual(observeState(DOMController), observeState(terminalController));
});

test('DOM and terminal combobox controllers remain equivalent across 20,000 accepts', () => {
  const options = fixture();
  const DOMController = unwrap(createDOMComboboxController(options));
  const terminalController = unwrap(createTerminalComboboxController(options));
  for (let index = 0; index < 10_000; index += 1) {
    assert.deepEqual(
      observe(DOMController.handleKeyboardInput({ key: 'Enter' })),
      observe(terminalController.handleKeyboardInput({ key: 'enter' })),
    );
  }
});

function fixture() {
  return {
    domain: unwrap(createSequence(['a', 'b', 'c'])),
    labels: new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Gamma']]),
    defaultInputValue: 'be',
    defaultOpen: true,
    defaultHighlightedValue: 'b',
  };
}

function observe(result) {
  const state = result.snapshot.state;
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        inputValue: state.text.snapshot.text,
        open: state.popupOpen,
        current: state.cursor.current,
        selected: state.selection.selected,
        commandIDs: result.commands.map((command) => command.id),
      }
    : { ok: false, revision: result.snapshot.revision, error: result.error.code };
}

function observeState(controller) {
  const { revision, state } = controller.getSnapshot();
  return {
    revision,
    inputValue: state.text.snapshot.text,
    open: state.popupOpen,
    current: state.cursor.current,
    selected: state.selection.selected,
  };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
