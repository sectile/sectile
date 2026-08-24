import {
  Fragment, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted,
  nextTick, provide, shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType,
  type VNodeChild,
} from 'vue';
import { createDatePicker, createDatePickerMonth, createDatePickerYear, type DatePickerConnection, type DatePickerMonthValue, type DatePickerViewMode } from '@sectile/dom/date-picker';
import { createDateRangePicker } from '@sectile/dom/date-range-picker';
import { createDateTimePicker } from '@sectile/dom/date-time-picker';
import { createDateTimeRangePicker } from '@sectile/dom/date-time-range-picker';
import { formatDateValue, parseDateValue, type DateRange, type DateValue } from '@sectile/dom/date-field';
import { formatDateTimeValue, type DateTimeRange, type DateTimeValue } from '@sectile/dom/date-time-field';
import { formatTimeValue, type TimeValue } from '@sectile/dom/time-field';
import { Primitive, type PrimitiveAs } from '../primitive.js';

export type PickerKind = 'date' | 'date-range' | 'date-time' | 'date-time-range';
export type PickerValue = DateValue | DateRange | DateTimeValue | DateTimeRange | null;
export type PickerInputPart = 'input' | 'start-input' | 'end-input' | 'date-time-input' | 'date-input' | 'time-input' | 'start-date-time-input' | 'end-date-time-input' | 'start-date-input' | 'end-date-input' | 'start-time-input' | 'end-time-input';
export type PickerNavigationUnit = 'week' | 'month' | 'year';
export interface PickerYearValue { readonly year: number }
export interface PickerRootSlotProps { readonly value: PickerValue; readonly highlightedValue: DateValue; readonly open: boolean; readonly dates: readonly (readonly DateValue[])[]; readonly months: readonly (readonly DatePickerMonthValue[])[]; readonly years: readonly (readonly PickerYearValue[])[]; readonly view: { readonly year: number; readonly month: number }; readonly viewMode: DatePickerViewMode; readonly disabled: boolean; readonly: boolean }
export interface PickerCellSlotProps { readonly value: DateValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean; readonly outsideMonth: boolean }
export interface PickerMonthCellSlotProps { readonly value: DatePickerMonthValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface PickerYearCellSlotProps { readonly value: PickerYearValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface PickerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

export interface PickerRootConfig {
  readonly scope?: string;
  readonly granularity?: 'day' | 'month' | 'year';
  readonly defaultView?: DatePickerViewMode;
  readonly defaultOpen?: boolean;
  readonly yearPageSize?: number;
  readonly inline?: boolean;
}

export interface PickerRootRuntimeProps {
  readonly modelValue?: PickerValue;
  readonly defaultValue?: PickerValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly defaultView?: DatePickerViewMode;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: Readonly<Record<string, unknown>>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface PickerConnection {
  getSnapshot(): { readonly state: unknown };
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly DatePickerMonthValue[])[];
  syncControlledValues(values: Record<string, unknown>): { readonly ok: boolean; readonly error?: { readonly message: string } };
  setCellAttributes(element: HTMLElement, value: DateValue): void;
  handleEvent(event: unknown): boolean;
  refresh(): void;
  disconnect(): void;
}
interface Context {
  readonly kind: PickerKind;
  readonly scope: string;
  readonly granularity: 'day' | 'month' | 'year';
  readonly inline: boolean;
  readonly state: ComputedRef<PickerRootSlotProps>;
  register(part: PickerInputPart | 'content' | 'grid' | 'trigger', element?: HTMLElement): void;
  registerCell(element: HTMLElement, value: DateValue): void;
  move(unit: PickerNavigationUnit, direction: -1 | 1): void;
  setViewMode(value: DatePickerViewMode): void;
  selectDate(value: DateValue): void;
  selectMonth(value: DatePickerMonthValue): void;
  selectYear(value: PickerYearValue): void;
}
const key = Symbol('SectileDatePickerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export function createPickerRoot(kind: PickerKind, name: string, config: PickerRootConfig = {}) {
  const scope = config.scope ?? kind;
  const granularity = config.granularity ?? 'day';
  const defaultView = config.defaultView ?? (granularity === 'day' ? 'month' : 'year');
  const defaultOpen = config.defaultOpen ?? false;
  const yearPageSize = config.yearPageSize ?? 12;
  const inline = config.inline ?? false;
  return defineComponent({
    name, inheritAttrs: false,
    props: {
      modelValue: { type: Object as PropType<PickerValue>, default: undefined }, defaultValue: { type: Object as PropType<PickerValue>, default: null },
      open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: defaultOpen },
      highlightedValue: { type: Object as PropType<DateValue>, default: undefined }, defaultHighlightedValue: { type: Object as PropType<DateValue>, default: undefined },
      defaultView: { type: String as PropType<DatePickerViewMode>, default: defaultView },
      disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, required: { type: Boolean, default: false },
      label: { type: String, default: undefined }, policies: { type: Object as PropType<Readonly<Record<string, unknown>>>, default: undefined },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
    },
    emits: { 'update:modelValue': (_value: PickerValue): boolean => true, 'update:open': (_value: boolean): boolean => true, 'update:highlightedValue': (_value: DateValue): boolean => true },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
    setup(props, { emit, slots }) {
      const elements = new Map<string, HTMLElement>(); const connection = shallowRef<PickerConnection>();
      const inlineTrigger = typeof document === 'undefined' || !inline ? undefined : document.createElement('button');
      const localValue = shallowRef<PickerValue>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
      const localOpen = shallowRef(props.open ?? props.defaultOpen);
      const localHighlight = shallowRef<DateValue>(props.highlightedValue ?? props.defaultHighlightedValue ?? dateOf(localValue.value) ?? Object.freeze({ year: 1970, month: 1, day: 1 }));
      const dates = shallowRef<readonly (readonly DateValue[])[]>(monthFor(localHighlight.value));
      const months = shallowRef<readonly (readonly DatePickerMonthValue[])[]>(yearFor(localHighlight.value.year));
      const years = shallowRef<readonly (readonly PickerYearValue[])[]>(yearsFor(localHighlight.value.year, yearPageSize));
      const localView = shallowRef(Object.freeze({ year: localHighlight.value.year, month: localHighlight.value.month }));
      const localViewMode = shallowRef<DatePickerViewMode>(props.defaultView);
      const controlled = { value: props.modelValue !== undefined, open: props.open !== undefined, highlighted: props.highlightedValue !== undefined };
      const state = computed<PickerRootSlotProps>(() => {
        const highlighted = props.highlightedValue ?? localHighlight.value;
        return Object.freeze({
          value: props.modelValue !== undefined ? props.modelValue : localValue.value,
          highlightedValue: highlighted, open: props.open ?? localOpen.value, dates: dates.value, months: months.value, years: years.value,
          view: localView.value, viewMode: localViewMode.value, disabled: props.disabled, readonly: props.readonly,
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
        localOpen.value = picked.open; localView.value = picked.view; localViewMode.value = picked.viewMode;
        if (connection.value !== undefined) {
          dates.value = picked.viewMode === 'week' ? [connection.value.getWeek()] : picked.viewMode === 'month' ? connection.value.getMonth() : [];
          months.value = picked.viewMode === 'year' ? connection.value.getYear() : [];
          years.value = yearsFor(picked.view.year, yearPageSize);
        }
        refreshCells();
        void nextTick(refreshCells);
      };
      const connect = (): void => {
        connection.value?.disconnect();
        const content = elements.get('content'); const grid = elements.get('grid'); const trigger = elements.get('trigger') ?? inlineTrigger;
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
        connection.value = created as unknown as PickerConnection;
        if (props.defaultView !== 'month') connection.value.handleEvent({ type: 'set-view-mode', value: props.defaultView });
        refreshCells(); refresh();
      };
      provide<Context>(key, {
        kind, scope, granularity, inline, state,
        register: (part, element) => { if (element === undefined) elements.delete(part); else elements.set(part, element); },
        registerCell: (element, value) => connection.value?.setCellAttributes(element, value),
        move: (unit, direction) => {
          const repetitions = granularity === 'year' && unit === 'year' ? yearPageSize : 1;
          for (let index = 0; index < repetitions; index += 1) connection.value?.handleEvent(`${direction < 0 ? 'previous' : 'next'}-${unit}`);
          refresh();
        },
        setViewMode: (value) => { connection.value?.handleEvent({ type: 'set-view-mode', value }); refresh(); },
        selectDate: (value) => {
          const type = kind === 'date' || kind === 'date-range' ? 'select' : 'select-date';
          connection.value?.handleEvent({ type, value });
          refresh();
        },
        selectMonth: (value) => {
          connection.value?.handleEvent(granularity === 'month'
            ? { type: kind === 'date' || kind === 'date-range' ? 'select' : 'select-date', value: { ...value, day: 1 } }
            : { type: 'select-month', value });
          refresh();
        },
        selectYear: (value) => {
          connection.value?.handleEvent({ type: kind === 'date' || kind === 'date-range' ? 'select' : 'select-date', value: { year: value.year, month: 1, day: 1 } });
          refresh();
        },
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
    'aria-haspopup': 'dialog', 'aria-expanded': String(root.state.value.open), 'data-scope': root.scope, 'data-part': 'trigger',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerContent = defineComponent({
  name: 'SectilePickerContent', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('content', node instanceof HTMLElement ? node : undefined),
    role: root.inline ? 'group' : 'dialog', 'aria-modal': root.inline ? undefined : 'false', hidden: root.inline ? false : !root.state.value.open, 'data-scope': root.scope, 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerGrid = defineComponent({
  name: 'SectilePickerGrid', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerGrid'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('grid', node instanceof HTMLElement ? node : undefined),
    role: 'grid', 'data-scope': root.scope, 'data-part': 'grid',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerCell = defineComponent({
  name: 'SectilePickerCell', inheritAttrs: false,
  props: { value: { type: Object as PropType<DateValue>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: PickerCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerCell'); const state = computed<PickerCellSlotProps>(() => cellState(root.kind, root.state.value, props.value)); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerCell(node, props.value); },
    disabled: state.value.disabled,
    onClick: (event: MouseEvent) => { event.stopPropagation(); root.selectDate(props.value); },
    role: 'gridcell', 'aria-selected': String(state.value.selected || state.value.inRange), 'data-sectile-picker-date': formatDateValue(props.value),
    'data-scope': root.scope, 'data-part': 'cell', 'data-selected': state.value.selected ? '' : undefined,
    'data-in-range': state.value.inRange ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
    'data-outside-month': state.value.outsideMonth ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export function createPickerMonthCell(part = 'month-cell', name = 'SectilePickerMonthCell') {
  return defineComponent({
    name, inheritAttrs: false,
    props: { value: { type: Object as PropType<DatePickerMonthValue>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerMonthCellSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name);
      const state = computed<PickerMonthCellSlotProps>(() => ({
        value: props.value,
        selected: monthContainsValue(root.state.value.value, props.value),
        inRange: periodInRange(root.state.value.value, { ...props.value, day: 1 }, { ...props.value, day: 31 }),
        highlighted: root.state.value.highlightedValue.year === props.value.year && root.state.value.highlightedValue.month === props.value.month,
        disabled: root.state.value.disabled,
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        disabled: state.value.disabled, onClick: () => root.selectMonth(props.value),
        'data-scope': root.scope, 'data-part': part, 'data-selected': state.value.selected ? '' : undefined,
        'data-in-range': state.value.inRange ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
      }), { default: () => slots['default']?.(state.value) });
    },
  });
}

export function createPickerYearCell(part = 'year-cell', name = 'SectilePickerYearCell') {
  return defineComponent({
    name, inheritAttrs: false,
    props: { value: { type: Object as PropType<PickerYearValue>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerYearCellSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name);
      const state = computed<PickerYearCellSlotProps>(() => ({
        value: props.value,
        selected: yearContainsValue(root.state.value.value, props.value),
        inRange: periodInRange(root.state.value.value, { year: props.value.year, month: 1, day: 1 }, { year: props.value.year, month: 12, day: 31 }),
        highlighted: root.state.value.highlightedValue.year === props.value.year,
        disabled: root.state.value.disabled,
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        disabled: state.value.disabled, onClick: () => root.selectYear(props.value),
        'data-scope': root.scope, 'data-part': part, 'data-selected': state.value.selected ? '' : undefined,
        'data-in-range': state.value.inRange ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
      }), { default: () => slots['default']?.(state.value) });
    },
  });
}

export const PickerMonthCell = createPickerMonthCell();
export const PickerYearCell = createPickerYearCell();

export function createPickerInput(part: PickerInputPart, name: string) {
  return defineComponent({
    name, inheritAttrs: false,
    props: { name: { type: String, default: undefined }, form: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
    setup(props, { attrs }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register(part, node instanceof HTMLInputElement ? node : undefined),
      type: pickerInputType(part), name: props.name, form: props.form, disabled: root.state.value.disabled,
      readonly: root.state.value.readonly || part === 'start-input' || part === 'end-input' || part === 'start-date-time-input' || part === 'end-date-time-input',
      required: false, value: inputValue(root.kind, part, root.state.value.value),
      'data-scope': root.scope, 'data-part': part,
    })); },
  });
}

export function createPickerMove(unit: PickerNavigationUnit, direction: -1 | 1, name: string, part?: string) {
  return defineComponent({
    name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
      disabled: root.state.value.disabled, onClick: () => root.move(unit, direction), 'data-scope': root.scope, 'data-part': part ?? `${direction < 0 ? 'previous' : 'next'}-${unit}`,
    }), { default: () => slots['default']?.(root.state.value) }); },
  });
}

export function createPickerViewTrigger(view: DatePickerViewMode, name: string) {
  return defineComponent({
    name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
      disabled: root.state.value.disabled, onClick: () => root.setViewMode(view), 'aria-pressed': String(root.state.value.viewMode === view),
      'data-scope': root.scope, 'data-part': `${view}-view-trigger`, 'data-state': root.state.value.viewMode === view ? 'active' : 'inactive',
    }), { default: () => slots['default']?.(root.state.value) }); },
  });
}

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a date picker root.`); return root; }
function pickerInputType(_part: PickerInputPart): 'text' {
  return 'text';
}
function monthFor(value: DateValue): readonly (readonly DateValue[])[] { const result = createDatePickerMonth({ year: value.year, month: value.month }); if (!result.ok) throw new TypeError(result.error.message); return result.value; }
function yearFor(year: number): readonly (readonly DatePickerMonthValue[])[] { const result = createDatePickerYear(year); if (!result.ok) throw new TypeError(result.error.message); return result.value; }
function yearsFor(year: number, pageSize: number): readonly (readonly PickerYearValue[])[] {
  const start = year - Math.floor(pageSize / 2);
  const columns = 4;
  return Array.from({ length: Math.ceil(pageSize / columns) }, (_row, rowIndex) =>
    Array.from({ length: columns }, (_column, columnIndex) => Object.freeze({ year: start + rowIndex * columns + columnIndex })),
  );
}
function dateOf(value: PickerValue): DateValue | null { if (value === null) return null; if ('year' in value) return value; if ('date' in value) return value.date; const start = value.start; return 'date' in start ? start.date : start; }
function extractState(kind: PickerKind, raw: unknown): { value: PickerValue; highlighted: DateValue; open: boolean; view: { readonly year: number; readonly month: number }; viewMode: DatePickerViewMode } {
  const state = raw as Record<string, unknown>;
  if (kind === 'date') return { value: state['value'] as PickerValue, highlighted: state['highlighted'] as DateValue, open: state['open'] as boolean, view: state['view'] as { readonly year: number; readonly month: number }, viewMode: state['viewMode'] as DatePickerViewMode };
  const calendar = state['calendar'] as Record<string, unknown>;
  return { value: state['value'] as PickerValue, highlighted: calendar['highlighted'] as DateValue, open: calendar['open'] as boolean, view: calendar['view'] as { readonly year: number; readonly month: number }, viewMode: calendar['viewMode'] as DatePickerViewMode };
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
  if (kind === 'date-time') {
    const dateTime = value as DateTimeValue;
    return part === 'time-input' ? formatTimeValue(dateTime.time) : part === 'date-input' ? formatDateValue(dateTime.date) : formatDateTimeValue(dateTime);
  }
  const range = value as DateRange | DateTimeRange; const endpoint = part.startsWith('start') ? range.start : range.end;
  if ('date' in endpoint) return part.endsWith('time-input') && !part.includes('date-time') ? formatTimeValue(endpoint.time) : part.endsWith('date-input') ? formatDateValue(endpoint.date) : formatDateTimeValue(endpoint);
  return formatDateValue(endpoint);
}
function monthContainsValue(value: PickerValue, month: DatePickerMonthValue): boolean { const date = dateOf(value); return date !== null && date.year === month.year && date.month === month.month; }
function yearContainsValue(value: PickerValue, year: PickerYearValue): boolean { const date = dateOf(value); return date !== null && date.year === year.year; }
function periodInRange(value: PickerValue, start: DateValue, end: DateValue): boolean {
  if (value === null || 'year' in value || 'date' in value) return false;
  const rangeStart = 'date' in value.start ? value.start.date : value.start;
  const rangeEnd = 'date' in value.end ? value.end.date : value.end;
  return compare(rangeStart, end) <= 0 && compare(start, rangeEnd) <= 0;
}
function inputParts(kind: PickerKind): readonly PickerInputPart[] { return kind === 'date' ? ['input'] : kind === 'date-range' ? ['start-input', 'end-input'] : kind === 'date-time' ? ['date-time-input', 'date-input', 'time-input'] : ['start-date-time-input', 'end-date-time-input', 'start-date-input', 'end-date-input', 'start-time-input', 'end-time-input']; }
function toDOMInputKey(part: PickerInputPart): string {
  if (part === 'date-time-input') return 'dateTimeInput';
  if (part === 'start-date-time-input') return 'startDateTimeInput';
  if (part === 'end-date-time-input') return 'endDateTimeInput';
  return part.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
