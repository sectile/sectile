import {
  Fragment, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted,
  provide, shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType,
  type VNodeChild,
} from 'vue';
import { createDatePicker, createDatePickerMonth, type DatePickerConnection } from '@sectile/dom/date-picker';
import { createDateRangePicker } from '@sectile/dom/date-range-picker';
import { createDateTimePicker } from '@sectile/dom/date-time-picker';
import { createDateTimeRangePicker } from '@sectile/dom/date-time-range-picker';
import { formatDateValue, parseDateValue, type DateRange, type DateValue } from '@sectile/dom/date-field';
import { formatDateTimeValue, type DateTimeRange, type DateTimeValue } from '@sectile/dom/date-time-field';
import { formatTimeValue, type TimeValue } from '@sectile/dom/time-field';
import { Primitive, type PrimitiveAs } from '../primitive.js';

export type PickerKind = 'date' | 'date-range' | 'date-time' | 'date-time-range';
export type PickerValue = DateValue | DateRange | DateTimeValue | DateTimeRange | null;
export type PickerInputPart = 'input' | 'start-input' | 'end-input' | 'time-input' | 'start-time-input' | 'end-time-input';
export interface PickerRootSlotProps { readonly value: PickerValue; readonly highlightedValue: DateValue; readonly open: boolean; readonly month: readonly (readonly DateValue[])[]; readonly view: { readonly year: number; readonly month: number }; readonly disabled: boolean; readonly: boolean }
export interface PickerCellSlotProps { readonly value: DateValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean; readonly outsideMonth: boolean }
export interface PickerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

export interface PickerRootRuntimeProps {
  readonly modelValue?: PickerValue;
  readonly defaultValue?: PickerValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: unknown;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface PickerConnection {
  getSnapshot(): { readonly state: unknown };
  getMonth(): readonly (readonly DateValue[])[];
  syncControlledValues(values: Record<string, unknown>): { readonly ok: boolean; readonly error?: { readonly message: string } };
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: unknown): boolean;
  refresh(): void;
  disconnect(): void;
}
interface Context {
  readonly kind: PickerKind;
  readonly state: ComputedRef<PickerRootSlotProps>;
  register(part: PickerInputPart | 'content' | 'grid' | 'trigger', element?: HTMLElement): void;
  registerCell(element: HTMLElement, value: DateValue): void;
  move(direction: -1 | 1): void;
}
const key = Symbol('SectileDatePickerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export function createPickerRoot(kind: PickerKind, name: string) {
  return defineComponent({
    name, inheritAttrs: false,
    props: {
      modelValue: { type: Object as PropType<PickerValue>, default: undefined }, defaultValue: { type: Object as PropType<PickerValue>, default: null },
      open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false },
      highlightedValue: { type: Object as PropType<DateValue>, default: undefined }, defaultHighlightedValue: { type: Object as PropType<DateValue>, default: undefined },
      disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, required: { type: Boolean, default: false },
      label: { type: String, default: undefined }, policies: { type: Object as PropType<unknown>, default: undefined },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
    },
    emits: { 'update:modelValue': (_value: PickerValue): boolean => true, 'update:open': (_value: boolean): boolean => true, 'update:highlightedValue': (_value: DateValue): boolean => true },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
    setup(props, { emit, slots }) {
      const elements = new Map<string, HTMLElement>(); const connection = shallowRef<PickerConnection>();
      const localValue = shallowRef<PickerValue>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
      const localOpen = shallowRef(props.open ?? props.defaultOpen);
      const localHighlight = shallowRef<DateValue>(props.highlightedValue ?? props.defaultHighlightedValue ?? dateOf(localValue.value) ?? Object.freeze({ year: 1970, month: 1, day: 1 }));
      const month = shallowRef<readonly (readonly DateValue[])[]>(monthFor(localHighlight.value));
      const controlled = { value: props.modelValue !== undefined, open: props.open !== undefined, highlighted: props.highlightedValue !== undefined };
      const state = computed<PickerRootSlotProps>(() => {
        const highlighted = props.highlightedValue ?? localHighlight.value;
        return Object.freeze({
          value: props.modelValue !== undefined ? props.modelValue : localValue.value,
          highlightedValue: highlighted, open: props.open ?? localOpen.value, month: month.value,
          view: Object.freeze({ year: highlighted.year, month: highlighted.month }), disabled: props.disabled, readonly: props.readonly,
        });
      });
      const refreshCells = (): void => {
        const grid = elements.get('grid'); if (grid === undefined || connection.value === undefined) return;
        grid.querySelectorAll<HTMLElement>('[data-sectile-picker-date]').forEach((element) => {
          const parsed = parseDateValue(element.dataset['sectilePickerDate'] ?? '');
          if (parsed.ok) connection.value?.setCellAttributes(element, parsed.value);
        });
      };
      const refresh = (): void => {
        const raw = connection.value?.getSnapshot().state; if (raw === undefined) return;
        const picked = extractState(kind, raw); localValue.value = picked.value; localHighlight.value = picked.highlighted;
        localOpen.value = picked.open; month.value = connection.value?.getMonth() ?? month.value; refreshCells();
      };
      const connect = (): void => {
        connection.value?.disconnect();
        const content = elements.get('content'); const grid = elements.get('grid'); const trigger = elements.get('trigger');
        if (content === undefined || grid === undefined || trigger === undefined) return;
        const base: Record<string, unknown> = {
          root: content, grid, trigger, disabled: props.disabled, readOnly: props.readonly, required: props.required,
          ...(props.label === undefined ? {} : { label: props.label }), ...(props.policies === undefined ? {} : { policies: props.policies }),
          ...(controlled.value ? { value: props.modelValue } : { defaultValue: localValue.value }),
          ...(controlled.open ? { open: props.open } : { defaultOpen: localOpen.value }),
          ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : { defaultHighlightedValue: localHighlight.value }),
          onValueChange: (value: PickerValue) => { localValue.value = value; emit('update:modelValue', value); },
          onHighlightedValueChange: (value: DateValue) => { localHighlight.value = value; emit('update:highlightedValue', value); },
          onOpenChange: (value: boolean) => { localOpen.value = value; emit('update:open', value); }, onUpdate: refresh,
        };
        for (const part of inputParts(kind)) { const element = elements.get(part); if (element !== undefined) base[toDOMInputKey(part)] = element; }
        const created = kind === 'date' ? createDatePicker(base as never)
          : kind === 'date-range' ? createDateRangePicker(base as never)
            : kind === 'date-time' ? createDateTimePicker(base as never) : createDateTimeRangePicker(base as never);
        connection.value = created as unknown as PickerConnection; month.value = connection.value.getMonth(); refreshCells(); refresh();
      };
      provide<Context>(key, {
        kind, state,
        register: (part, element) => { if (element === undefined) elements.delete(part); else elements.set(part, element); },
        registerCell: (element, value) => connection.value?.setCellAttributes(element, value),
        move: (direction) => { connection.value?.handleEvent(direction < 0 ? 'previous-month' : 'next-month'); refresh(); },
      });
      onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
      watch([() => props.disabled, () => props.readonly, () => props.required, () => props.label, () => props.policies], connect);
      watch([() => props.modelValue, () => props.open, () => props.highlightedValue], () => {
        if (connection.value === undefined) return;
        const result = connection.value.syncControlledValues({
          ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.open ? { open: props.open } : {}),
          ...(controlled.highlighted ? { highlightedValue: props.highlightedValue } : {}),
        });
        if (!result.ok) throw new TypeError(result.error?.message ?? 'Could not synchronize picker values.'); refresh();
      });
      return (): VNodeChild => h(Fragment as Component, null, slots['default']?.(state.value) ?? []);
    },
  });
}

export const PickerTrigger = defineComponent({
  name: 'SectilePickerTrigger', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('trigger', node instanceof HTMLElement ? node : undefined),
    type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled,
    'aria-haspopup': 'dialog', 'aria-expanded': String(root.state.value.open), 'data-scope': root.kind, 'data-part': 'trigger',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerContent = defineComponent({
  name: 'SectilePickerContent', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('content', node instanceof HTMLElement ? node : undefined),
    role: 'dialog', 'aria-modal': 'false', hidden: !root.state.value.open, 'data-scope': root.kind, 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerGrid = defineComponent({
  name: 'SectilePickerGrid', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerGrid'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('grid', node instanceof HTMLElement ? node : undefined),
    role: 'grid', 'data-scope': root.kind, 'data-part': 'grid',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerCell = defineComponent({
  name: 'SectilePickerCell', inheritAttrs: false,
  props: { value: { type: Object as PropType<DateValue>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: PickerCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerCell'); const state = computed<PickerCellSlotProps>(() => cellState(root.kind, root.state.value, props.value)); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerCell(node, props.value); },
    role: 'gridcell', 'aria-selected': String(state.value.selected || state.value.inRange), 'data-sectile-picker-date': formatDateValue(props.value),
    'data-scope': root.kind, 'data-part': 'cell', 'data-selected': state.value.selected ? '' : undefined,
    'data-in-range': state.value.inRange ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
    'data-outside-month': state.value.outsideMonth ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export function createPickerInput(part: PickerInputPart, name: string) {
  return defineComponent({
    name, inheritAttrs: false,
    props: { name: { type: String, default: undefined }, form: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
    setup(props, { attrs }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register(part, node instanceof HTMLInputElement ? node : undefined),
      type: 'text', name: props.name, form: props.form, disabled: root.state.value.disabled,
      readonly: root.state.value.readonly || part === 'start-input' || part === 'end-input',
      required: false, value: inputValue(root.kind, part, root.state.value.value),
      'data-scope': root.kind, 'data-part': part,
    })); },
  });
}

export function createPickerMove(direction: -1 | 1, name: string) {
  return defineComponent({
    name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
      disabled: root.state.value.disabled, onClick: () => root.move(direction), 'data-scope': root.kind, 'data-part': direction < 0 ? 'previous' : 'next',
    }), { default: () => slots['default']?.(root.state.value) }); },
  });
}

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a date picker root.`); return root; }
function monthFor(value: DateValue): readonly (readonly DateValue[])[] { const result = createDatePickerMonth({ year: value.year, month: value.month }); if (!result.ok) throw new TypeError(result.error.message); return result.value; }
function dateOf(value: PickerValue): DateValue | null { if (value === null) return null; if ('year' in value) return value; if ('date' in value) return value.date; const start = value.start; return 'date' in start ? start.date : start; }
function extractState(kind: PickerKind, raw: unknown): { value: PickerValue; highlighted: DateValue; open: boolean } {
  const state = raw as Record<string, unknown>;
  if (kind === 'date') return { value: state['value'] as PickerValue, highlighted: state['highlighted'] as DateValue, open: state['open'] as boolean };
  const calendar = state['calendar'] as Record<string, unknown>;
  return { value: state['value'] as PickerValue, highlighted: calendar['highlighted'] as DateValue, open: calendar['open'] as boolean };
}
function compare(left: DateValue, right: DateValue): number { return left.year - right.year || left.month - right.month || left.day - right.day; }
function cellState(kind: PickerKind, state: PickerRootSlotProps, value: DateValue): PickerCellSlotProps {
  const selectedDate = dateOf(state.value); let selected = selectedDate !== null && compare(selectedDate, value) === 0; let inRange = false;
  if (state.value !== null && !('year' in state.value) && !('date' in state.value)) {
    const start = 'date' in state.value.start ? state.value.start.date : state.value.start;
    const end = 'date' in state.value.end ? state.value.end.date : state.value.end;
    inRange = compare(start, value) <= 0 && compare(value, end) <= 0; selected = compare(start, value) === 0 || compare(end, value) === 0;
  }
  return { value, selected, inRange, highlighted: compare(state.highlightedValue, value) === 0, disabled: state.disabled, outsideMonth: value.month !== state.view.month || value.year !== state.view.year };
}
function inputValue(kind: PickerKind, part: PickerInputPart, value: PickerValue): string {
  if (value === null) return '';
  if (kind === 'date') return formatDateValue(value as DateValue);
  if (kind === 'date-time') return part === 'time-input' ? formatTimeValue((value as DateTimeValue).time) : formatDateTimeValue(value as DateTimeValue);
  const range = value as DateRange | DateTimeRange; const endpoint = part.startsWith('start') ? range.start : range.end;
  if ('date' in endpoint) return part.includes('time') ? formatTimeValue(endpoint.time) : formatDateTimeValue(endpoint);
  return formatDateValue(endpoint);
}
function inputParts(kind: PickerKind): readonly PickerInputPart[] { return kind === 'date' ? ['input'] : kind === 'date-range' ? ['start-input', 'end-input'] : kind === 'date-time' ? ['input', 'time-input'] : ['start-input', 'end-input', 'start-time-input', 'end-time-input']; }
function toDOMInputKey(part: PickerInputPart): string { return part.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase()); }
