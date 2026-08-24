import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createComboboxController as createDOMComboboxController } from '@sectile/dom/combobox';
import { createSequence } from '@sectile/core/sequence';
import { createComboboxController as createTerminalComboboxController } from '@sectile/terminal/combobox';

test('DOM and terminal combobox controllers produce equivalent editing and navigation traces', () => {
  const options = fixture();
  const DOMController = unwrap(createDOMComboboxController(options));
  const terminalController = unwrap(createTerminalComboboxController(options));
  assert.deepEqual(
    observe(DOMController.handleTextInput({
      type: 'beforeinput',
      inputType: 'insertText',
      data: 'al',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: 0,
      selection: selection(2),
    })),
    observe(terminalController.handleTextInput({
      type: 'insert',
      text: 'al',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: 0,
      selection: selection(2),
    })),
  );
  assert.deepEqual(
    observe(DOMController.handleKeyboardInput({ key: 'ArrowDown' })),
    observe(terminalController.handleKeyboardInput({ key: 'down' })),
  );
  assert.deepEqual(
    observe(DOMController.handleKeyboardInput({ key: 'Enter' })),
    observe(terminalController.handleKeyboardInput({ key: 'enter' })),
  );
  assert.deepEqual(observeState(DOMController), observeState(terminalController));
});

test('DOM and terminal combobox controllers remain equivalent across 20,000 operations', () => {
  const DOMController = unwrap(createDOMComboboxController(fixture()));
  const terminalController = unwrap(createTerminalComboboxController(fixture()));
  for (let index = 0; index < 10_000; index += 1) {
    if (index % 2 === 0) {
      const text = index % 4 === 0 ? 'al' : 'be';
      const length = DOMController.getSnapshot().state.text.snapshot.text.length;
      assert.deepEqual(
        observe(DOMController.handleTextInput({
          type: 'beforeinput',
          inputType: 'insertReplacementText',
          data: text,
          startCodeUnitOffset: 0,
          endCodeUnitOffset: length,
          selection: selection(text.length),
        })),
        observe(terminalController.handleTextInput({
          type: 'replace',
          text,
          startCodeUnitOffset: 0,
          endCodeUnitOffset: length,
          selection: selection(text.length),
        })),
      );
    } else {
      assert.deepEqual(
        observe(DOMController.handleKeyboardInput({ key: 'ArrowDown' })),
        observe(terminalController.handleKeyboardInput({ key: 'down' })),
      );
    }
  }
});

function fixture() {
  return {
    domain: createSequence(['a', 'b', 'c']),
    labels: new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Alpine']]),
    policies: {
      matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()),
      boundary: 'wrap',
    },
  };
}

function observe(result) {
  const state = result.snapshot.state;
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        inputState: state.text,
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
    inputState: state.text,
    open: state.popupOpen,
    current: state.cursor.current,
    selected: state.selection.selected,
  };
}

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}
