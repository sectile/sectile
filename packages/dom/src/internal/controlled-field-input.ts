import {
  createTextEditingState,
  tryCreateTextEditingState,
  type TextEditingState,
} from '@sectile/core/text';

interface SelectionElement {
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
  readonly selectionDirection: 'forward' | 'backward' | 'none' | null;
}

export function synchronizeFieldInputSelection(
  inputState: TextEditingState,
  element: SelectionElement,
): TextEditingState {
  if (inputState.composition !== null || element.selectionStart === null) return inputState;
  const start = element.selectionStart;
  const end = element.selectionEnd ?? start;
  const backward = element.selectionDirection === 'backward';
  const result = tryCreateTextEditingState(inputState.snapshot.text, {
    anchorCodeUnitOffset: backward ? end : start,
    focusCodeUnitOffset: backward ? start : end,
  });
  return result.ok ? result.value : inputState;
}

export function synchronizeControlledFieldInput(
  inputState: TextEditingState,
  previousText: string,
  nextText: string,
): TextEditingState {
  if (inputState.composition !== null || inputState.snapshot.text !== previousText) {
    return inputState;
  }
  const selection = inputState.snapshot.selection;
  const mapOffset = (offset: number): number => (
    offset === previousText.length ? nextText.length : Math.min(offset, nextText.length)
  );
  return createTextEditingState(nextText, {
    anchorCodeUnitOffset: mapOffset(selection.anchorCodeUnitOffset),
    focusCodeUnitOffset: mapOffset(selection.focusCodeUnitOffset),
  });
}
