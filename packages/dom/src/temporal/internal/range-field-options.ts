import type { TextEditingState } from '@sectile/core/text';

export function optionalInputState<Key extends 'startInputState' | 'endInputState'>(key: Key, value: TextEditingState | undefined): { readonly [Property in Key]?: TextEditingState } {
  return value === undefined ? {} : { [key]: value } as { readonly [Property in Key]?: TextEditingState };
}

/** Explicit presentation overrides restored endpoints; absence preserves each. */
export function rangeFormats<Format>(format: Format | undefined, state?: { readonly start: { readonly format?: Format }; readonly end: { readonly format?: Format } }): { readonly startFormat?: Format; readonly endFormat?: Format } {
  if (format !== undefined) return { startFormat: format, endFormat: format };
  return {
    ...(state?.start.format === undefined ? {} : { startFormat: state.start.format }),
    ...(state?.end.format === undefined ? {} : { endFormat: state.end.format }),
  };
}
