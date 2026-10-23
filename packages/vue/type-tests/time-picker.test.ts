import { h, useTemplateRef } from 'vue';
import {
  TimePickerRoot, TimePickerInput, TimePickerColumn, TimePickerItem,
  type TimePickerRootProps, type TimePickerRootSlots, type TimePickerColumnSlots,
  type TimePickerItemSlots, type TimePickerExpose, type TimePickerInputExpose,
  type TimePickerRootEmits, type TimePickerPart, type TimeValue, type TimePickerColumnProps,
} from '@sectile/vue/temporal/time-picker';
import { ListboxRoot, type ListboxRootProps } from '@sectile/vue/listbox';

const time: TimeValue = { hour: 12, minute: 30, second: 0, millisecond: 0 };
const props: TimePickerRootProps = { modelValue: time, name: undefined, form: undefined,
  disabled: undefined, readonly: undefined, required: undefined, precision: 'second',
  policies: { min: time }, side: 'bottom', tracking: 'events', unmountOnExit: true };
h(TimePickerRoot, { ...props, 'onUpdate:modelValue': (value: TimeValue | null) => { void value; } });
const rootSlots: TimePickerRootSlots = { default(state) {
  const value: TimeValue | null = state.value;
  const parts: readonly TimePickerPart[] = state.parts;
  const committed: boolean = state.selectChoice('hour', 12);
  const composing: boolean = state.composing;
  void value; void parts; void committed; void composing;
  return 'Time';
} };
const columnSlots: TimePickerColumnSlots = { default(state) {
  const choice = state.choices[0];
  if (choice !== undefined && !choice.disabled) { const value: TimeValue = choice.value; void value; }
  const id: number | null = state.highlighted; void id;
  return 'Choices';
} };
const itemSlots: TimePickerItemSlots = { default(state) {
  const label: string = state.choice.label, selected: boolean = state.selected;
  void selected; return label;
} };
void rootSlots; void columnSlots; void itemSlots;
const root = useTemplateRef<InstanceType<typeof TimePickerRoot>>('picker');
const input = useTemplateRef<InstanceType<typeof TimePickerInput>>('input');
const view: TimePickerExpose | null = root.value;
const inputView: TimePickerInputExpose | null = input.value;
const element: HTMLInputElement | null = view?.element ?? null;
view?.focus({ preventScroll: true }); view?.select(); view?.requestClose();
view?.selectChoice('minute', 30); inputView?.select(); void element;
const emitted: TimePickerRootEmits['update:modelValue'] = [time]; void emitted;
h(TimePickerColumn, { part: 'hour', label: 'Hours' });
const visibleHours: TimePickerColumnProps = { part: 'hour', label: 'Hours', renderedChoices: [9, 10] };
h(TimePickerColumn, visibleHours);
h(TimePickerColumn, { part: 'hour', label: 'Hours', renderedChoices: undefined });
const listboxWindow: ListboxRootProps = { items: ['morning', 'afternoon'], renderedItems: ['morning'] };
h(ListboxRoot, listboxWindow);
h(ListboxRoot, { items: ['morning'], renderedItems: undefined });
h(TimePickerItem, { value: 12 });
// @ts-expect-error TimePicker rendered choices keep numeric owner IDs
const invalidWindow: TimePickerColumnProps = { part: 'hour', label: 'Hours', renderedChoices: ['09'] }; void invalidWindow;
// @ts-expect-error Listbox rendered identities use its string domain
const invalidListboxWindow: ListboxRootProps = { items: ['morning'], renderedItems: [0] }; void invalidListboxWindow;
// @ts-expect-error time values are structured, not display strings
const invalid: TimePickerRootProps = { modelValue: '12:30' }; void invalid;
// @ts-expect-error visible parts use Temporal's closed part vocabulary
view?.selectChoice('timezone', 0);
// @ts-expect-error choice identity is numeric, not a localized display label
view?.selectChoice('hour', '12');
// @ts-expect-error public native element is read-only
if (view) view.element = null;
// @ts-expect-error each column requires a caller-owned accessible label
h(TimePickerColumn, { part: 'hour' });
// @ts-expect-error item IDs are numbers
h(TimePickerItem, { value: '12' });
