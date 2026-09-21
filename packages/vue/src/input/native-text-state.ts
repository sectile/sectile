import { tryCreateTextEditingState, type TextEditingState } from '@sectile/core/text';

export function captureNativeTextState(
  element: HTMLInputElement | HTMLTextAreaElement,
  fallbackText: string,
): TextEditingState {
  const text = element.value;
  const start = element.selectionStart;
  const end = element.selectionEnd;
  const selection = start === null || end === null
    ? { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length }
    : element.selectionDirection === 'backward'
      ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: start }
      : { anchorCodeUnitOffset: start, focusCodeUnitOffset: end };
  const state = tryCreateTextEditingState(text, selection);
  if (state.ok) return state.value;
  const fallback = tryCreateTextEditingState(fallbackText, {
    anchorCodeUnitOffset: fallbackText.length,
    focusCodeUnitOffset: fallbackText.length,
  });
  if (!fallback.ok) throw new TypeError('Native text fallback state is invalid.');
  return fallback.value;
}
