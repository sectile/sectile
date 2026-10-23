import { createTimePicker, tryCreateTimePicker, type TimePicker, type TimePickerOptions, type TimePickerChoice, type TimePickerState } from '@sectile/temporal/time-picker';
import { createTimeFieldFormat, createTimeValue, type TimeValue } from '@sectile/temporal/time-field';
import type { TemporalOwnErrorCode } from '@sectile/temporal';
const options: TimePickerOptions = { min: createTimeValue(9), max: createTimeValue(17), format: createTimeFieldFormat({ precision: 'second', hourCycle: 'h12' }) };
const model: TimePicker = createTimePicker(options);
tryCreateTimePicker(options);
const projected = model.resolve(null);
if (projected.ok) {
  const state: TimePickerState = projected.value;
  for (const column of state.columns) for (const choice of column.choices) {
    if (!choice.disabled) { const value: TimeValue = choice.value; void value; }
    model.select(state.value, column.part, choice.id);
  }
}
const codes: readonly TemporalOwnErrorCode[] = ['invalid-time-picker-part', 'invalid-time-picker-choice']; void codes;
// @ts-expect-error Enabled choices always carry a concrete time.
const wrong: TimePickerChoice = { id: 0, label: '00', value: null, disabled: false }; void wrong;
// @ts-expect-error Selection parts belong to the admitted TimeField format vocabulary.
model.select(null, 'week', 0);
// @ts-expect-error Choice IDs are numeric column IDs, not serialized times.
model.select(null, 'minute', '09:30');
// @ts-expect-error Bounds are portable TimeValues, not strings.
createTimePicker({ min: '09:30' });
