import { computed, defineComponent, h, shallowRef, watch, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { unwrap } from '@sectile/core/result';
import { compareTimeValues, type TimeFieldPrecision, type TimeValue } from '@sectile/temporal/time-field';
import { createTimePicker, timeChoicePrecision, type TimePickerState } from '@sectile/temporal/time-picker';
import { dateTimeChoiceInterval } from '@sectile/temporal/date-time-picker';
import { provideFormBoundary } from '../form/context.js';
import { useTimePresentation } from './internal/time-presentation.js';
import { usePickerTimeChoices } from './picker.js';
import { provideTimePickerColumns, TimePickerColumn, TimePickerItem, type TimePickerColumnState, type TimePickerPart } from './time-picker.js';

export interface DateTimePickerTimeChoicesProps {
  readonly label?: string;
  readonly precision?: TimeFieldPrecision;
}
export interface DateTimeRangePickerTimeChoicesProps extends DateTimePickerTimeChoicesProps {
  readonly endpoint: 'start' | 'end';
  readonly label: string;
}
export interface DateTimeTimeChoicesSlotProps {
  readonly value: TimeValue | null;
  readonly columns: readonly TimePickerColumnState[];
  readonly empty: boolean;
  readonly disabled: boolean;
  readonly readonly: boolean;
  selectChoice(part: TimePickerPart, choice: number): boolean;
}
export type DateTimeTimeChoicesSlots = { default: (props: DateTimeTimeChoicesSlotProps) => VNodeChild };

const labels: Readonly<Record<TimePickerPart, string>> = {
  hour: 'Hours', minute: 'Minutes', second: 'Seconds', millisecond: 'Milliseconds', dayPeriod: 'Day period',
};
const emptyState: TimePickerState = Object.freeze({ value: null, columns: Object.freeze([]) });
const props = {
  label: { type: String, default: 'Time' },
  precision: { type: String as PropType<TimeFieldPrecision>, default: 'minute' as const },
};

function sameTime(a: TimeValue | null | undefined, b: TimeValue | null | undefined): boolean {
  return a === b || a != null && b != null && compareTimeValues(a, b) === 0;
}

const ChoiceColumn = /* @__PURE__ */ defineComponent({
  props: { column: { type: Object as PropType<TimePickerColumnState>, required: true } },
  setup(props) {
    const highlighted = shallowRef<number | null>(null);
    const rendered = computed(() => {
      const { part, selected, choices } = props.column;
      if (part !== 'millisecond') return undefined;
      const center = highlighted.value ?? selected ?? choices.find(choice => !choice.disabled)?.id ?? 0;
      const from = Math.max(0, Math.min(choices.length - 25, center - 12));
      return choices.slice(from, from + 25).map(choice => choice.id);
    });
    return () => h(TimePickerColumn, {
      part: props.column.part, label: labels[props.column.part], renderedChoices: rendered.value,
      style: { maxHeight: '12em', overflowY: 'auto' },
      onHighlight: (choice: number | null) => { highlighted.value = choice; },
    }, { default: () => (rendered.value ?? props.column.choices.map(choice => choice.id)).map(id => h(TimePickerItem, { key: id, value: id })) });
  },
});

function setupChoices(
  input: Readonly<DateTimePickerTimeChoicesProps & { endpoint?: 'start' | 'end' }>,
  attrs: Readonly<Record<string, unknown>>,
  slots: Readonly<Partial<DateTimeTimeChoicesSlots>>,
  kind: 'date-time' | 'date-time-range',
): () => VNodeChild {
  const root = usePickerTimeChoices('DateTimeTimeChoices');
  if (root.kind !== kind) throw new TypeError('Time choices must be placed inside their matching date-time picker.');
  provideFormBoundary();
  const current = computed(() => root.readTimeChoices(input.endpoint));
  const value = computed<TimeValue | null>(previous => sameTime(previous, current.value.value) ? previous ?? null : current.value.value);
  const interval = computed<ReturnType<typeof dateTimeChoiceInterval>>(previous => {
    const next = dateTimeChoiceInterval(current.value.limits);
    return previous !== undefined && previous.empty === next.empty && sameTime(previous.min, next.min) && sameTime(previous.max, next.max)
      ? previous : next;
  });
  const open = computed(() => root.active.value && root.state.value.open);
  const requiredPrecision = computed(() => timeChoicePrecision(input.precision ?? 'minute', value.value, interval.value.min, interval.value.max));
  const precision = shallowRef(requiredPrecision.value);
  watch([open, requiredPrecision], ([open, needed]) => {
    if (!open || needed === 'millisecond' || needed === 'second' && precision.value === 'minute') precision.value = needed;
  }, { flush: 'sync' });
  const format = useTimePresentation({ get precision() { return precision.value; } }, value => value);
  const model = computed(() => {
    if (!open.value || interval.value.empty || format.value === undefined) return null;
    const { min, max } = interval.value;
    return createTimePicker({ format: format.value, ...(min === undefined ? {} : { min }), ...(max === undefined ? {} : { max }) });
  });
  const state = computed(() => model.value === null ? emptyState : unwrap(model.value.resolve(value.value)));
  const disabled = computed(() => root.state.value.disabled || model.value === null);
  const readonly = computed(() => root.state.value.readonly);
  const composing = computed(() => current.value.composing);
  const error = shallowRef('');
  watch(open, value => { if (!value) error.value = ''; });
  const selectChoice = (part: TimePickerPart, id: number): boolean => {
    if (disabled.value || readonly.value || composing.value) return false;
    const picked = model.value?.select(value.value, part, id);
    const accepted = picked?.ok === true && root.selectTime(picked.value, input.endpoint);
    error.value = accepted ? '' : 'That time is unavailable.';
    return accepted;
  };
  provideTimePickerColumns({ model, state, disabled, readonly, composing, selectChoice });
  return () => {
    if (!open.value) return null;
    const columns = state.value.columns, empty = model.value === null;
    return h('div', { ...attrs, role: 'group', 'aria-label': input.label, 'data-part': 'time-choices', 'data-endpoint': input.endpoint }, [
      slots.default?.({ value: value.value, columns, empty, disabled: disabled.value, readonly: readonly.value, selectChoice })
        ?? (empty ? h('p', { role: 'status' }, 'No available times.') : columns.map(column => h(ChoiceColumn, { key: column.part, column }))),
      h('span', { role: 'status' }, error.value),
    ]);
  };
}

export const DateTimePickerTimeChoices = /* @__PURE__ */ defineComponent<DateTimePickerTimeChoicesProps, {}, string, SlotsType<DateTimeTimeChoicesSlots>>(
  (props, { attrs, slots }) => setupChoices(props, attrs, slots, 'date-time'),
  { name: 'SectileDateTimePickerTimeChoices', inheritAttrs: false, props },
);
export const DateTimeRangePickerTimeChoices = /* @__PURE__ */ defineComponent<DateTimeRangePickerTimeChoicesProps, {}, string, SlotsType<DateTimeTimeChoicesSlots>>(
  (props, { attrs, slots }) => setupChoices(props, attrs, slots, 'date-time-range'),
  { name: 'SectileDateTimeRangePickerTimeChoices', inheritAttrs: false, props: {
    ...props, endpoint: { type: String as PropType<'start' | 'end'>, required: true },
    label: { type: String, required: true },
  } },
);
