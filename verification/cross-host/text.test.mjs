import assert from 'node:assert/strict';
import test from 'node:test';
import { createTextController as createDOMTextController } from '@sectile/dom/text';
import { createTextEditingState } from '@sectile/primitives/text';
import { createTextController as createTerminalTextController } from '@sectile/terminal/text';

test('DOM and terminal text controllers produce equivalent replacement traces', () => {
  const initial = unwrap(createTextEditingState('a😀b', selection(4)));
  const DOMController = unwrap(createDOMTextController({ defaultValue: initial }));
  const terminalController = unwrap(createTerminalTextController({ defaultValue: initial }));
  assert.deepEqual(
    observe(DOMController.handleTextInput({
      type: 'beforeinput',
      inputType: 'insertReplacementText',
      data: '가',
      startCodeUnitOffset: 1,
      endCodeUnitOffset: 3,
      selection: selection(2),
    })),
    observe(terminalController.handleTextInput({
      type: 'replace',
      text: '가',
      startCodeUnitOffset: 1,
      endCodeUnitOffset: 3,
      selection: selection(2),
    })),
  );
});

test('DOM and terminal text controllers remain equivalent across 20,000 edits', () => {
  const DOMController = unwrap(createDOMTextController());
  const terminalController = unwrap(createTerminalTextController());
  let previousLength = 0;
  for (let index = 0; index < 10_000; index += 1) {
    const text = index % 2 === 0 ? 'a😀' : '한글';
    const nextSelection = selection(text.length);
    assert.deepEqual(
      observe(DOMController.handleTextInput({
        type: 'beforeinput',
        inputType: 'insertReplacementText',
        data: text,
        startCodeUnitOffset: 0,
        endCodeUnitOffset: previousLength,
        selection: nextSelection,
      })),
      observe(terminalController.handleTextInput({
        type: 'replace',
        text,
        startCodeUnitOffset: 0,
        endCodeUnitOffset: previousLength,
        selection: nextSelection,
      })),
    );
    previousLength = text.length;
  }
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        revision: result.snapshot.revision,
        state: result.snapshot.state,
        commands: result.commands,
      }
    : { ok: false, revision: result.snapshot.revision, error: result.error.code };
}

function selection(offset) {
  return { anchorCodeUnitOffset: offset, focusCodeUnitOffset: offset };
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
