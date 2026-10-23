export type FieldDigits = readonly [string, string, string, string, string, string, string, string, string, string];
/** Shared glyph admission; field order, literals and value semantics stay with each field. */
export function validFieldDigits(value: unknown): value is FieldDigits {
  return Array.isArray(value) && value.length === 10 && new Set(value).size === 10
    && value.every(text => typeof text === 'string' && text.length >= 1 && text.length <= 2
      && [...text].length === 1 && text.length === value[0].length);
}
interface Selection { readonly anchorCodeUnitOffset: number; readonly focusCodeUnitOffset: number }
/** Preserve selection direction while a field owner supplies logical target bounds. */
export function projectFieldSelection(previous: Selection, previousLength: number, start: number, end: number, nextLength: number): Selection {
  const all = Math.min(previous.anchorCodeUnitOffset, previous.focusCodeUnitOffset) === 0 && Math.max(previous.anchorCodeUnitOffset, previous.focusCodeUnitOffset) === previousLength;
  if (all) { start = 0; end = nextLength; }
  return previous.anchorCodeUnitOffset === previous.focusCodeUnitOffset ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: end }
    : previous.anchorCodeUnitOffset > previous.focusCodeUnitOffset ? { anchorCodeUnitOffset: end, focusCodeUnitOffset: start }
      : { anchorCodeUnitOffset: start, focusCodeUnitOffset: end };
}
