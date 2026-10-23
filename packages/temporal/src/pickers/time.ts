import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from '../error.js';
import { fail, ok } from '../internal/foundation.js';
import { addTimeMilliseconds, createTimeValue, timeToMilliseconds, tryCreateTimeValue, type TimeValue } from '../values/time.js';
import { applyTimeFieldEvent, tryCreateTimeFieldState, type TimeFieldPolicies, type TimeFieldState } from '../fields/time.js';
import { createTimeFieldFormat, formatTimeFieldValue, parseTimeFieldValue, timeFieldFormatLayout, type TimeFieldFormat, type TimeFieldFormatPart } from '../fields/time-format.js';

export interface TimePickerOptions extends Pick<TimeFieldPolicies, 'min' | 'max'> {
  readonly format?: TimeFieldFormat;
}
interface TimePickerChoiceIdentity {
  readonly id: number;
  readonly label: string;
}
export type TimePickerChoice = TimePickerChoiceIdentity & (
  | { readonly value: TimeValue; readonly disabled: false }
  | { readonly value: null; readonly disabled: true }
);
export interface TimePickerColumn {
  readonly part: TimeFieldFormatPart;
  readonly selected: number | null;
  readonly choices: readonly TimePickerChoice[];
}
export interface TimePickerState {
  readonly value: TimeValue | null;
  readonly columns: readonly TimePickerColumn[];
}
/** Immutable part-choice model. Text editing, open state and navigation keep their existing owners. */
export interface TimePicker {
  readonly format: TimeFieldFormat;
  resolve(value?: TimeValue | null): TemporalResult<TimePickerState>;
  select(value: TimeValue | null, part: TimeFieldFormatPart, choiceId: number): TemporalResult<TimeValue>;
}
interface Choice { readonly id: number; readonly label: string }
interface Column { readonly part: TimeFieldFormatPart; readonly index: number; readonly choices: readonly Choice[] }
interface Frame {
  readonly state: TimeFieldState;
  readonly text: string;
  readonly layout: { readonly starts: readonly number[]; readonly ends: readonly number[] };
}
const priority = { dayPeriod: 0, hour: 1, minute: 2, second: 3, millisecond: 4 } as const;

export function createTimePicker(options: TimePickerOptions = {}): TimePicker {
  return unwrap(tryCreateTimePicker(options));
}
export function tryCreateTimePicker(options: TimePickerOptions = {}): TemporalResult<TimePicker> {
  const format = options.format ?? createTimeFieldFormat({ precision: 'minute' });
  const empty = tryCreateTimeFieldState(null, undefined, format);
  if (!empty.ok) return empty;
  const bounds: { min?: TimeValue; max?: TimeValue } = {};
  for (const key of ['min', 'max'] as const) {
    const value = options[key];
    if (value === undefined) continue;
    const captured = tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
    if (!captured.ok) return captured;
    bounds[key] = captured.value;
  }
  const admitted = applyTimeFieldEvent(empty.value, 'cancel', bounds);
  if (!admitted.ok) return admitted;
  Object.freeze(bounds);
  const midnight = createTimeValue(0);
  const quantum = format.precision === 'minute' ? 60_000 : format.precision === 'second' ? 1_000 : 1;
  const lower = Math.ceil(timeToMilliseconds(bounds.min ?? midnight) / quantum) * quantum;
  const upper = Math.floor(timeToMilliseconds(bounds.max ?? createTimeValue(23, 59, 59, 999)) / quantum) * quantum;
  const hasCandidates = lower <= upper;
  const first = hasCandidates ? unwrap(addTimeMilliseconds(midnight, lower)) : midnight;
  const last = hasCandidates ? unwrap(addTimeMilliseconds(midnight, upper)) : midnight;
  const columns: readonly Column[] = Object.freeze(format.order.map((part, index) => {
    const count = part === 'dayPeriod' ? 2 : part === 'hour' ? format.dayPeriods === undefined ? 24 : 12 : part === 'millisecond' ? 1_000 : 60;
    const choices: Choice[] = [];
    for (let id = 0; id < count; id++) {
      let label: string;
      if (part === 'dayPeriod') label = format.dayPeriods![id]!;
      else {
        const value = createTimeValue(part === 'hour' ? id : 0, part === 'minute' ? id : 0,
          part === 'second' ? id : 0, part === 'millisecond' ? id : 0);
        const text = formatTimeFieldValue(value, format), layout = unwrap(timeFieldFormatLayout(format, value));
        label = text.slice(layout.starts[index], layout.ends[index]);
      }
      choices.push(Object.freeze({ id, label }));
    }
    return Object.freeze({ part, index, choices: Object.freeze(choices) });
  }));
  const frame = (value: TimeValue | null): TemporalResult<Frame> => {
    const state = tryCreateTimeFieldState(value ?? first, undefined, format);
    if (!state.ok) return state;
    const layout = timeFieldFormatLayout(format, state.value.value);
    return layout.ok ? ok({ state: state.value, text: state.value.inputState.snapshot.text, layout: layout.value }) : layout;
  };
  const choose = (source: Frame, column: Column, choice: Choice): TemporalResult<TimeValue> => {
    const text = source.text.slice(0, source.layout.starts[column.index]) + choice.label + source.text.slice(source.layout.ends[column.index]);
    const parsed = parseTimeFieldValue(text, format);
    if (!parsed.ok) return parsed;
    let candidate = parsed.value;
    const ticks = timeToMilliseconds(candidate);
    const bounded = !hasCandidates ? candidate : ticks < lower ? first : ticks > upper ? last : candidate;
    if (bounded !== candidate) {
      const boundedText = formatTimeFieldValue(bounded, format), layout = unwrap(timeFieldFormatLayout(format, bounded));
      let samePrefix = true;
      for (const other of columns) {
        if (priority[other.part] > priority[column.part]) continue;
        const expected = other === column ? choice.label : source.text.slice(source.layout.starts[other.index], source.layout.ends[other.index]);
        if (boundedText.slice(layout.starts[other.index], layout.ends[other.index]) !== expected) { samePrefix = false; break; }
      }
      if (samePrefix) candidate = bounded;
    }
    const result = applyTimeFieldEvent(source.state, { type: 'set-value', value: candidate }, bounds);
    return result.ok ? ok(result.value.state.value!) : result;
  };
  return ok(Object.freeze({
    format,
    resolve(value: TimeValue | null = null): TemporalResult<TimePickerState> {
      const source = frame(value);
      if (!source.ok) return source;
      const projected: TimePickerColumn[] = [];
      for (const column of columns) {
        let selected: number | null = null;
        const label = source.value.text.slice(source.value.layout.starts[column.index], source.value.layout.ends[column.index]);
        const choices: TimePickerChoice[] = [];
        for (const choice of column.choices) {
          if (value !== null && choice.label === label) selected = choice.id;
          const result = choose(source.value, column, choice);
          if (!result.ok && result.error.code !== 'time-field-value-below-minimum' && result.error.code !== 'time-field-value-above-maximum') return result;
          choices.push(result.ok
            ? Object.freeze({ ...choice, value: result.value, disabled: false as const })
            : Object.freeze({ ...choice, value: null, disabled: true as const }));
        }
        projected.push(Object.freeze({ part: column.part, selected, choices: Object.freeze(choices) }));
      }
      return ok(Object.freeze({ value: value === null ? null : source.value.state.value, columns: Object.freeze(projected) }));
    },
    select(value: TimeValue | null, part: TimeFieldFormatPart, choiceId: number): TemporalResult<TimeValue> {
      const column = columns.find(column => column.part === part);
      if (column === undefined) return fail('transition-rejection', 'invalid-time-picker-part', 'Time picker part must be present in its admitted format.');
      if (!Number.isSafeInteger(choiceId) || choiceId < 0 || choiceId >= column.choices.length) return fail('transition-rejection', 'invalid-time-picker-choice', 'Time picker choice must be an ID from its part column.');
      const source = frame(value);
      return source.ok ? choose(source.value, column, column.choices[choiceId]!) : source;
    },
  }));
}
