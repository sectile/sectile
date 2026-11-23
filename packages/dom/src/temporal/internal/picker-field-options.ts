import type { TextEditingState } from '@sectile/core/text';
import type { DOMTemporalResult } from './result.js';
import { tryCreateTimeFieldState, type TimeFieldFormat, type TimeValue } from '@sectile/temporal/time-field';

export function admitPickerTimes<T>(result: DOMTemporalResult<T>, format: TimeFieldFormat | undefined,
  project: (value: T) => readonly TimeValue[],
): DOMTemporalResult<T> {
  if (!result.ok || format === undefined) return result;
  for (const time of project(result.value)) {
    const admitted = tryCreateTimeFieldState(time, undefined, format);
    if (!admitted.ok) return admitted;
  }
  return result;
}

/** A restored editor keeps its format until an explicit presentation replaces it. */
export function preparePickerFieldState<Value, Format, State extends {
  readonly value: Value | null; readonly inputState: TextEditingState; readonly format?: Format | undefined;
}>(field: State | undefined, format: Format | undefined,
  create: (value: Value | null, input?: TextEditingState, format?: Format) => DOMTemporalResult<State>,
  reformat: (state: State, format?: Format) => DOMTemporalResult<State>,
  explicit: boolean = format !== undefined,
): DOMTemporalResult<State> {
  const valid = create(field?.value ?? null, field?.inputState, field === undefined ? format : field.format);
  return !valid.ok || field === undefined || !explicit || format === field.format
    ? valid : reformat(valid.value, format);
}

/** Explicit undefined clears presentation; omitted configuration restores the field's format. */
export function pickerFieldFormat<Format>(format: Format | undefined, field: { readonly format?: Format | undefined } | undefined,
  explicit: boolean): { readonly format?: Format } {
  const selected = explicit ? format : field?.format;
  return selected === undefined ? {} : { format: selected };
}
