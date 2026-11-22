import { tryCreateTextEditingState, type TextEditingState } from '@sectile/core/text';

export type FieldDigits = readonly [string, string, string, string, string, string, string, string, string, string];
/** Shared glyph admission; field order, literals and value semantics stay with each field. */
export function validFieldDigits(value: unknown): value is FieldDigits {
  return Array.isArray(value) && value.length === 10 && new Set(value).size === 10
    && value.every(text => typeof text === 'string' && text.length >= 1 && text.length <= 2
      && [...text].length === 1 && text.length === value[0].length);
}
interface Selection { readonly anchorCodeUnitOffset: number; readonly focusCodeUnitOffset: number }

/** The browser decides when to prepare a replacement; the field owns the numeric boundaries. */
export function numericFieldSegment<Part extends string>(
  offset: number, parts: readonly Part[], starts: readonly number[], ends: readonly number[],
  digits: FieldDigits | undefined, key?: string,
): readonly [start: number, end: number] | null {
  if (key !== undefined && !(digits?.includes(key) ?? /^[0-9]$/u.test(key))) return null;
  const index = ends.findIndex(end => offset <= end);
  if (index === -1 || parts[index] === 'dayPeriod') return null;
  return [starts[index]!, ends[index]!];
}

export function retainCommittedFieldSelection(input: TextEditingState, previous: TextEditingState, leadingOffset: number): ReturnType<typeof tryCreateTextEditingState> {
  const { text } = input.snapshot;
  const selection = previous.snapshot.selection;
  const project = (offset: number) => Math.min(text.length, Math.max(0, offset - leadingOffset));
  return tryCreateTextEditingState(text, {
    anchorCodeUnitOffset: project(selection.anchorCodeUnitOffset),
    focusCodeUnitOffset: project(selection.focusCodeUnitOffset),
  });
}

/** Preserve selection direction while a field owner supplies logical target bounds. */
export function projectFieldSelection(previous: Selection, previousLength: number, start: number, end: number, nextLength: number): Selection {
  const all = Math.min(previous.anchorCodeUnitOffset, previous.focusCodeUnitOffset) === 0 && Math.max(previous.anchorCodeUnitOffset, previous.focusCodeUnitOffset) === previousLength;
  if (all) { start = 0; end = nextLength; }
  return previous.anchorCodeUnitOffset === previous.focusCodeUnitOffset ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: end }
    : previous.anchorCodeUnitOffset > previous.focusCodeUnitOffset ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: start }
      : { anchorCodeUnitOffset: start, focusCodeUnitOffset: end };
}
