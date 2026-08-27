import {
  Fragment, Teleport, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted,
  nextTick, provide, shallowRef, watch, type AllowedComponentProps, type Component,
  type ComponentCustomProps, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
  type VNodeProps,
} from 'vue';
import { createCalendar, type CalendarPolicies } from '@sectile/dom/calendar';
import { createDatePicker, createCalendarMonth, createCalendarYear, isCalendarValueAvailable, type DatePickerConnection, type DatePickerOptions, type PickerPositionOptions, type CalendarMonthValue, type CalendarViewMode } from '@sectile/dom/date-picker';
import { createDateRangePicker, type DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import { createDateTimePicker, type DateTimePickerOptions } from '@sectile/dom/date-time-picker';
import { createDateTimeRangePicker, type DateTimeRangePickerOptions } from '@sectile/dom/date-time-range-picker';
import { formatDateValue, parseDateValue, type DateRange, type DateValue } from '@sectile/dom/date-field';
import { formatDateTimeValue, type DateTimeRange, type DateTimeValue } from '@sectile/dom/date-time-field';
import { formatTimeValue, type TimeValue } from '@sectile/dom/time-field';
import type { FormSubmissionRegistration } from '../form.js';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
} from './form-control.js';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { useControlledStateInvariant } from './controlled-state.js';
import { useHostPortalTarget, useHostReferenceDate } from '../host-provider.js';

export type PickerKind = 'calendar' | 'date' | 'date-range' | 'date-time' | 'date-time-range';
export type PickerValue = DateValue | DateRange | DateTimeValue | DateTimeRange | null;
export type PickerValueFor<Kind extends PickerKind> =
  Kind extends 'calendar' | 'date' ? DateValue | null
    : Kind extends 'date-range' ? DateRange | null
      : Kind extends 'date-time' ? DateTimeValue | null
        : DateTimeRange | null;
export type PickerPoliciesFor<Kind extends PickerKind> =
  Kind extends 'calendar' ? CalendarPolicies
    : Kind extends 'date' ? NonNullable<DatePickerOptions['policies']>
      : Kind extends 'date-range' ? NonNullable<DateRangePickerOptions['policies']>
        : Kind extends 'date-time' ? NonNullable<DateTimePickerOptions['policies']>
          : NonNullable<DateTimeRangePickerOptions['policies']>;
export type PickerInputPart = 'input' | 'start-input' | 'end-input' | 'date-time-input' | 'date-input' | 'time-input' | 'start-date-time-input' | 'end-date-time-input' | 'start-date-input' | 'end-date-input' | 'start-time-input' | 'end-time-input';
export type PickerNavigationUnit = 'week' | 'month' | 'year';
export interface PickerYearValue { readonly year: number }
export interface PickerRootSlotProps<Value extends PickerValue = PickerValue> { readonly value: Value; readonly highlightedValue: DateValue; readonly open: boolean; readonly dates: readonly (readonly DateValue[])[]; readonly months: readonly (readonly CalendarMonthValue[])[]; readonly years: readonly (readonly PickerYearValue[])[]; readonly view: { readonly year: number; readonly month: number }; readonly viewMode: CalendarViewMode; readonly disabled: boolean; readonly: boolean }
export interface PickerCellSlotProps { readonly value: DateValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean; readonly outsideMonth: boolean }
export interface PickerMonthCellSlotProps { readonly value: CalendarMonthValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly disabled: boolean }
export interface PickerYearCellSlotProps { readonly value: PickerYearValue; readonly selected: boolean; readonly inRange: boolean; readonly highlighted: boolean; readonly current: boolean; readonly disabled: boolean }
export interface PickerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PickerPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }
export interface PickerPositionProps {
  readonly position?: boolean;
  readonly side?: PickerPositionOptions['side'];
  readonly align?: PickerPositionOptions['align'];
  readonly sideOffset?: number;
  readonly collisionPadding?: PickerPositionOptions['collisionPadding'];
  readonly collisionBoundary?: PickerPositionOptions['collisionBoundary'];
  readonly avoidCollisions?: boolean;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: PickerPositionOptions['strategy'];
  readonly middleware?: PickerPositionOptions['middleware'];
  readonly autoUpdate?: PickerPositionOptions['autoUpdate'];
}

export interface PickerRootConfig {
  readonly scope?: string;
  readonly granularity?: 'day' | 'month' | 'year';
  readonly defaultView?: CalendarViewMode;
  readonly defaultOpen?: boolean;
  readonly yearPageSize?: number;
  readonly inline?: boolean;
}

export interface PickerRootRuntimeProps<Value extends PickerValue = PickerValue, Policies = Readonly<Record<string, unknown>>> extends PickerPositionProps {
  readonly modelValue?: Value;
  readonly defaultValue?: Value;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly referenceDate?: DateValue;
  readonly defaultView?: CalendarViewMode;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: Policies;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

interface ResolvedPickerRootProps<Kind extends PickerKind> {
  readonly modelValue?: PickerValueFor<Kind>;
  readonly defaultValue: PickerValueFor<Kind>;
  readonly open?: boolean;
  readonly defaultOpen: boolean;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly referenceDate?: DateValue;
  readonly defaultView: CalendarViewMode;
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
  readonly label?: string;
  readonly policies?: PickerPoliciesFor<Kind>;
  readonly position: boolean;
  readonly side: NonNullable<PickerPositionOptions['side']>;
  readonly align: NonNullable<PickerPositionOptions['align']>;
  readonly sideOffset: number;
  readonly collisionPadding: PickerPositionOptions['collisionPadding'];
  readonly collisionBoundary: PickerPositionOptions['collisionBoundary'];
  readonly avoidCollisions: boolean;
  readonly hideWhenDetached: boolean;
  readonly strategy: NonNullable<PickerPositionOptions['strategy']>;
  readonly middleware: PickerPositionOptions['middleware'];
  readonly autoUpdate: PickerPositionOptions['autoUpdate'];
  readonly as: PrimitiveAs;
  readonly asChild: boolean;
}

export type PickerRootPublicProps<Kind extends PickerKind> =
  PickerRootRuntimeProps<PickerValueFor<Kind>, PickerPoliciesFor<Kind>>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly 'onUpdate:modelValue'?: (value: PickerValueFor<Kind>) => unknown;
    readonly 'onUpdate:open'?: (value: boolean) => unknown;
    readonly 'onUpdate:highlightedValue'?: (value: DateValue) => unknown;
    readonly onPositionChange?: NonNullable<PickerPositionOptions['onPositionChange']>;
  };

export interface PickerRootComponent<Kind extends PickerKind> {
  new (props: PickerRootPublicProps<Kind>): {
    $props: PickerRootPublicProps<Kind>;
    $slots: { default?: (props: PickerRootSlotProps<PickerValueFor<Kind>>) => VNodeChild };
  };
}

export type PickerRootPartPublicProps =
  PickerPartProps
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps;

export interface PickerRootPartComponent<Kind extends PickerKind> {
  new (props: PickerRootPartPublicProps): {
    $props: PickerRootPartPublicProps;
    $slots: { default?: (props: PickerRootSlotProps<PickerValueFor<Kind>>) => VNodeChild };
  };
}

export function specializePickerRootPart<Kind extends PickerKind>(
  _kind: Kind,
  component: Component,
): PickerRootPartComponent<Kind> {
  return component as unknown as PickerRootPartComponent<Kind>;
}

interface PickerConnection {
  getSnapshot(): { readonly state: unknown };
  getMonth(): readonly (readonly DateValue[])[];
  getWeek(): readonly DateValue[];
  getYear(): readonly (readonly CalendarMonthValue[])[];
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
  readonly position: ComputedRef<boolean>;
  readonly positioned: ComputedRef<boolean>;
  readonly strategy: ComputedRef<NonNullable<PickerPositionOptions['strategy']>>;
  readonly state: ComputedRef<PickerRootSlotProps>;
  register(part: PickerInputPart | 'content' | 'grid' | 'trigger', element?: HTMLElement): void;
  registerCell(element: HTMLElement, value: DateValue): void;
  move(unit: PickerNavigationUnit, direction: -1 | 1): void;
  handleGridKey(event: KeyboardEvent): void;
  setViewMode(value: CalendarViewMode): void;
  selectDate(value: DateValue): void;
  selectMonth(value: CalendarMonthValue): void;
  selectYear(value: PickerYearValue): void;
  periodAvailable(value: CalendarMonthValue | PickerYearValue): boolean;
}
const key = Symbol('SectileDatePickerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export function createPickerRoot<Kind extends PickerKind>(kind: Kind, name: string, config: PickerRootConfig = {}): PickerRootComponent<Kind> {
  const scope = config.scope ?? kind;
  const granularity = config.granularity ?? 'day';
  const defaultView = config.defaultView ?? (granularity === 'day' ? 'month' : 'year');
  const defaultOpen = config.defaultOpen ?? false;
  const yearPageSize = config.yearPageSize ?? 12;
  const inline = config.inline ?? false;
  const component = defineComponent({
    name, inheritAttrs: false,
    props: {
      modelValue: { type: Object as PropType<PickerValueFor<Kind>>, default: undefined }, defaultValue: { type: Object as PropType<PickerValueFor<Kind>>, default: null },
      open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: defaultOpen },
      highlightedValue: { type: Object as PropType<DateValue>, default: undefined }, defaultHighlightedValue: { type: Object as PropType<DateValue>, default: undefined },
      referenceDate: { type: Object as PropType<DateValue>, default: undefined },
      defaultView: { type: String as PropType<CalendarViewMode>, default: defaultView },
      disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, required: { type: Boolean, default: false },
      label: { type: String, default: undefined }, policies: { type: Object as PropType<PickerPoliciesFor<Kind>>, default: undefined },
      position: { type: Boolean, default: true },
      side: { type: String as PropType<NonNullable<PickerPositionOptions['side']>>, default: 'bottom' },
      align: { type: String as PropType<NonNullable<PickerPositionOptions['align']>>, default: 'start' },
      sideOffset: { type: Number, default: 4 },
      collisionPadding: { type: [Number, Object] as PropType<PickerPositionOptions['collisionPadding']>, default: 8 },
      collisionBoundary: { type: [String, Object, Array] as PropType<PickerPositionOptions['collisionBoundary']>, default: undefined },
      avoidCollisions: { type: Boolean, default: true }, hideWhenDetached: { type: Boolean, default: true },
      strategy: { type: String as PropType<NonNullable<PickerPositionOptions['strategy']>>, default: 'absolute' },
      middleware: { type: Array as PropType<PickerPositionOptions['middleware']>, default: undefined },
      autoUpdate: { type: [Boolean, Object] as PropType<PickerPositionOptions['autoUpdate']>, default: undefined },
      as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
    },
    emits: { 'update:modelValue': (_value: PickerValueFor<Kind>): boolean => true, 'update:open': (_value: boolean): boolean => true, 'update:highlightedValue': (_value: DateValue): boolean => true, positionChange: (_position: Parameters<NonNullable<PickerPositionOptions['onPositionChange']>>[0]): boolean => true },
    slots: Object as SlotsType<{ default: (props: PickerRootSlotProps<PickerValueFor<Kind>>) => VNodeChild }>,
    setup(props, { emit, slots }) {
      const runtimeProps = props as unknown as ResolvedPickerRootProps<Kind>;
      const elements = new Map<string, HTMLElement>(); const connection = shallowRef<PickerConnection>();
      const positioned = shallowRef(inline || !runtimeProps.position);
      const hostReferenceDate = useHostReferenceDate();
      const referenceDate = computed(() => runtimeProps.referenceDate ?? hostReferenceDate.value);
      const inlineTrigger = typeof document === 'undefined' || !inline || kind === 'calendar' ? undefined : document.createElement('button');
      const localValue = shallowRef<PickerValue>(runtimeProps.modelValue !== undefined ? runtimeProps.modelValue : runtimeProps.defaultValue);
      const localOpen = shallowRef(runtimeProps.open ?? runtimeProps.defaultOpen);
      const localHighlight = shallowRef<DateValue>(runtimeProps.highlightedValue ?? runtimeProps.defaultHighlightedValue ?? dateOf(localValue.value) ?? referenceDate.value);
      const yearPageStart = shallowRef(localHighlight.value.year - Math.floor(yearPageSize / 2));
      const dates = shallowRef<readonly (readonly DateValue[])[]>(monthFor(localHighlight.value));
      const months = shallowRef<readonly (readonly CalendarMonthValue[])[]>(yearFor(localHighlight.value.year));
      const years = shallowRef<readonly (readonly PickerYearValue[])[]>(yearsFrom(yearPageStart.value, yearPageSize));
      const localView = shallowRef(Object.freeze({ year: localHighlight.value.year, month: localHighlight.value.month }));
      const localViewMode = shallowRef<CalendarViewMode>(runtimeProps.defaultView);
      const controlled = {
        value: useControlledStateInvariant(`${kind}PickerRoot`, 'modelValue', () => runtimeProps.modelValue),
        open: useControlledStateInvariant(`${kind}PickerRoot`, 'open', () => runtimeProps.open),
        highlighted: useControlledStateInvariant(`${kind}PickerRoot`, 'highlightedValue', () => runtimeProps.highlightedValue),
      };
      const state = computed<PickerRootSlotProps>(() => {
        const highlighted = runtimeProps.highlightedValue ?? localHighlight.value;
        return Object.freeze({
          value: runtimeProps.modelValue !== undefined ? runtimeProps.modelValue : localValue.value,
          highlightedValue: highlighted, open: runtimeProps.open ?? localOpen.value, dates: dates.value, months: months.value, years: years.value,
          view: localView.value, viewMode: localViewMode.value, disabled: runtimeProps.disabled, readonly: runtimeProps.readonly,
        });
      });
      useCompositeFormControl({
        root: () => elements.get('content') ?? elements.get('grid') ?? null,
        focusTarget: () => elements.get('trigger') ?? (kind === 'calendar' ? null : firstPickerInput(elements, kind)) ?? elements.get('grid') ?? null,
        submissions: () => pickerFormSubmissions(elements, kind),
      });
      const periodAvailable = (value: CalendarMonthValue | PickerYearValue): boolean => {
        const policies = runtimeProps.policies as PeriodPolicies | undefined;
        if ('month' in value) return monthAvailable(value, policies);
        return Array.from({ length: 12 }, (_entry, index) => index + 1)
          .some((month) => monthAvailable({ year: value.year, month }, policies));
      };
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
          if (granularity === 'year') {
            yearPageStart.value = pageStartContaining(picked.highlighted.year, yearPageStart.value, yearPageSize);
            years.value = yearsFrom(yearPageStart.value, yearPageSize);
          }
        }
        refreshCells();
        void nextTick(refreshCells);
      };
      const connect = (): void => {
        connection.value?.disconnect();
        const content = elements.get('content'); const grid = elements.get('grid'); const trigger = elements.get('trigger') ?? inlineTrigger;
        if (content === undefined || grid === undefined || (kind !== 'calendar' && trigger === undefined)) return;
        positioned.value = inline || !runtimeProps.position;
        const base: Record<string, unknown> = {
          root: content, grid, disabled: runtimeProps.disabled, readOnly: runtimeProps.readonly, required: runtimeProps.required,
          referenceDate: referenceDate.value,
          ...(runtimeProps.label === undefined ? {} : { label: runtimeProps.label }), ...(runtimeProps.policies === undefined ? {} : { policies: runtimeProps.policies }),
          ...(controlled.value ? { value: runtimeProps.modelValue } : { defaultValue: localValue.value }),
          ...(controlled.highlighted ? { highlightedValue: runtimeProps.highlightedValue } : { defaultHighlightedValue: localHighlight.value }),
          onValueChange: (value: PickerValue) => { localValue.value = value; emit('update:modelValue', value as PickerValueFor<Kind>); },
          onHighlightedValueChange: (value: DateValue) => { localHighlight.value = value; emit('update:highlightedValue', value); },
          onUpdate: refresh,
        };
        if (kind !== 'calendar') {
          base['trigger'] = trigger;
          Object.assign(base, {
            position: runtimeProps.position, side: runtimeProps.side, align: runtimeProps.align, sideOffset: runtimeProps.sideOffset,
            collisionPadding: runtimeProps.collisionPadding, avoidCollisions: runtimeProps.avoidCollisions,
            hideWhenDetached: runtimeProps.hideWhenDetached, strategy: runtimeProps.strategy,
            middleware: runtimeProps.middleware, autoUpdate: runtimeProps.autoUpdate,
            onPositionChange: (position: Parameters<NonNullable<PickerPositionOptions['onPositionChange']>>[0]) => {
              positioned.value = true;
              emit('positionChange', position);
            },
          });
          if (runtimeProps.collisionBoundary !== undefined) base['collisionBoundary'] = runtimeProps.collisionBoundary;
          if (controlled.open) base['open'] = runtimeProps.open;
          else base['defaultOpen'] = localOpen.value;
          base['onOpenChange'] = (value: boolean) => { localOpen.value = value; emit('update:open', value); };
        }
        if (granularity === 'day') {
          for (const part of inputParts(kind)) {
            const element = elements.get(part);
            if (element !== undefined) base[toDOMInputKey(part)] = element;
          }
        }
        const created = kind === 'calendar' ? createCalendar(base as never)
          : kind === 'date' ? createDatePicker(base as never)
          : kind === 'date-range' ? createDateRangePicker(base as never)
            : kind === 'date-time' ? createDateTimePicker(base as never) : createDateTimeRangePicker(base as never);
        connection.value = created as unknown as PickerConnection;
        if (runtimeProps.defaultView !== 'month') connection.value.handleEvent({ type: 'set-view-mode', value: runtimeProps.defaultView });
        refreshCells(); refresh();
      };
      let connectQueued = false;
      const scheduleConnect = (): void => {
        if (connectQueued) return;
        connectQueued = true;
        void nextTick(() => { connectQueued = false; connect(); });
      };
      const moveBy = (unit: PickerNavigationUnit, delta: number): void => {
        const direction = delta < 0 ? -1 : 1;
        for (let index = 0; index < Math.abs(delta); index += 1) {
          connection.value?.handleEvent(`${direction < 0 ? 'previous' : 'next'}-${unit}`);
        }
        refresh();
      };
      const selectMonth = (value: CalendarMonthValue): void => {
        connection.value?.handleEvent(granularity === 'month'
          ? { type: kind === 'calendar' || kind === 'date' || kind === 'date-range' ? 'select' : 'select-date', value: { ...value, day: 1 } }
          : { type: 'select-month', value });
        refresh();
      };
      const selectYear = (value: PickerYearValue): void => {
        connection.value?.handleEvent({ type: kind === 'calendar' || kind === 'date' || kind === 'date-range' ? 'select' : 'select-date', value: { year: value.year, month: 1, day: 1 } });
        refresh();
      };
      provide<Context>(key, {
        kind, scope, granularity, inline, state, periodAvailable,
        position: computed(() => runtimeProps.position), positioned: computed(() => positioned.value), strategy: computed(() => runtimeProps.strategy),
        register: (part, element) => {
          if (elements.get(part) === element || (element === undefined && !elements.has(part))) return;
          if (element === undefined) elements.delete(part); else elements.set(part, element);
          if (part === 'content') positioned.value = inline || !runtimeProps.position;
          scheduleConnect();
        },
        registerCell: (element, value) => connection.value?.setCellAttributes(element, value),
        move: (unit, direction) => {
          const repetitions = granularity === 'year' && unit === 'year' ? yearPageSize : 1;
          moveBy(unit, direction * repetitions);
        },
        handleGridKey: (event) => {
          if ((granularity === 'day' && state.value.viewMode !== 'year') || event.altKey || event.ctrlKey || event.metaKey) return;
          const navigationGranularity = granularity === 'day' ? 'month' : granularity;
          const columns = navigationGranularity === 'month' ? 3 : 4;
          const highlighted = state.value.highlightedValue;
          let movement: { readonly unit: PickerNavigationUnit; readonly delta: number } | undefined;
          if (event.key === 'ArrowLeft') movement = { unit: navigationGranularity, delta: -1 };
          else if (event.key === 'ArrowRight') movement = { unit: navigationGranularity, delta: 1 };
          else if (event.key === 'ArrowUp') movement = { unit: navigationGranularity, delta: -columns };
          else if (event.key === 'ArrowDown') movement = { unit: navigationGranularity, delta: columns };
          else if (event.key === 'PageUp') movement = { unit: 'year', delta: navigationGranularity === 'year' ? -yearPageSize : -1 };
          else if (event.key === 'PageDown') movement = { unit: 'year', delta: navigationGranularity === 'year' ? yearPageSize : 1 };
          else if (event.key === 'Home') movement = { unit: navigationGranularity, delta: navigationGranularity === 'month' ? 1 - highlighted.month : -((highlighted.year - years.value[0]![0]!.year) % columns) };
          else if (event.key === 'End') movement = { unit: navigationGranularity, delta: navigationGranularity === 'month' ? 12 - highlighted.month : columns - 1 - ((highlighted.year - years.value[0]![0]!.year) % columns) };
          else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (navigationGranularity === 'month') selectMonth({ year: highlighted.year, month: highlighted.month });
            else selectYear({ year: highlighted.year });
            return;
          } else return;
          event.preventDefault();
          event.stopImmediatePropagation();
          if (movement.delta !== 0) moveBy(movement.unit, movement.delta);
        },
        setViewMode: (value) => { connection.value?.handleEvent({ type: 'set-view-mode', value }); refresh(); },
        selectDate: (value) => {
          const type = kind === 'calendar' || kind === 'date' || kind === 'date-range' ? 'select' : 'select-date';
          connection.value?.handleEvent({ type, value });
          refresh();
        },
        selectMonth,
        selectYear,
      });
      onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
      watch([
        () => runtimeProps.disabled, () => runtimeProps.readonly, () => runtimeProps.required, () => runtimeProps.label, () => runtimeProps.policies,
        () => runtimeProps.position, () => runtimeProps.side, () => runtimeProps.align, () => runtimeProps.sideOffset,
        () => runtimeProps.collisionPadding, () => runtimeProps.collisionBoundary, () => runtimeProps.avoidCollisions,
        () => runtimeProps.hideWhenDetached, () => runtimeProps.strategy, () => runtimeProps.middleware, () => runtimeProps.autoUpdate,
      ], connect);
      watch(referenceDate, (value) => {
        if (
          runtimeProps.highlightedValue === undefined
          && runtimeProps.defaultHighlightedValue === undefined
          && dateOf(runtimeProps.modelValue ?? runtimeProps.defaultValue) === null
        ) localHighlight.value = value;
        connect();
      });
      watch([() => runtimeProps.modelValue, () => runtimeProps.open, () => runtimeProps.highlightedValue], () => {
        if (connection.value === undefined) return;
        const result = connection.value.syncControlledValues({
          ...(controlled.value ? { value: runtimeProps.modelValue } : {}), ...(kind !== 'calendar' && controlled.open ? { open: runtimeProps.open } : {}),
          ...(controlled.highlighted ? { highlightedValue: runtimeProps.highlightedValue } : {}),
        });
        if (!result.ok) throw new TypeError(result.error?.message ?? 'Could not synchronize picker values.'); refresh();
      });
      return (): VNodeChild => {
        return h(Fragment as Component, null, slots['default']?.(state.value as PickerRootSlotProps<PickerValueFor<Kind>>) ?? []);
      };
    },
  });
  return component as unknown as PickerRootComponent<Kind>;
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
    style: !root.inline && root.position.value ? { position: root.strategy.value, visibility: root.positioned.value ? undefined : 'hidden' } : undefined,
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const PickerPortal = defineComponent({
  name: 'SectilePickerPortal', inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
    disabled: { type: Boolean, default: false }, defer: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    useRoot('PickerPortal');
    const portalTarget = useHostPortalTarget();
    return (): VNodeChild => h(Teleport as Component, {
      to: props.to ?? portalTarget.value ?? 'body', disabled: props.disabled, defer: props.defer,
    }, slots['default']?.());
  },
});

export const PickerGrid = defineComponent({
  name: 'SectilePickerGrid', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: PickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('PickerGrid'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.register('grid', node instanceof HTMLElement ? node : undefined),
    role: 'grid', onKeydown: root.handleGridKey, 'data-scope': root.scope, 'data-part': 'grid',
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
    props: { value: { type: Object as PropType<CalendarMonthValue>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
    slots: Object as SlotsType<{ default: (props: PickerMonthCellSlotProps) => VNodeChild }>,
    setup(props, { attrs, slots }) {
      const root = useRoot(name);
      const state = computed<PickerMonthCellSlotProps>(() => ({
        value: props.value,
        selected: monthContainsValue(root.state.value.value, props.value),
        inRange: periodInRange(root.state.value.value, { ...props.value, day: 1 }, { ...props.value, day: 31 }),
        highlighted: root.state.value.highlightedValue.year === props.value.year && root.state.value.highlightedValue.month === props.value.month,
        disabled: root.state.value.disabled || !root.periodAvailable(props.value),
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        disabled: state.value.disabled, tabIndex: state.value.highlighted ? 0 : -1,
        onClick: (event: MouseEvent) => { event.stopPropagation(); if (!state.value.disabled) root.selectMonth(props.value); },
        role: 'gridcell', 'aria-selected': String(state.value.selected || state.value.inRange),
        'aria-disabled': String(state.value.disabled),
        'data-sectile-picker-month': `${String(props.value.year).padStart(4, '0')}-${String(props.value.month).padStart(2, '0')}`,
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
      const currentYear = new Date().getFullYear();
      const state = computed<PickerYearCellSlotProps>(() => ({
        value: props.value,
        selected: yearContainsValue(root.state.value.value, props.value),
        inRange: periodInRange(root.state.value.value, { year: props.value.year, month: 1, day: 1 }, { year: props.value.year, month: 12, day: 31 }),
        highlighted: root.state.value.highlightedValue.year === props.value.year,
        current: props.value.year === currentYear,
        disabled: root.state.value.disabled || !root.periodAvailable(props.value),
      }));
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        disabled: state.value.disabled, tabIndex: state.value.highlighted ? 0 : -1,
        onClick: (event: MouseEvent) => { event.stopPropagation(); if (!state.value.disabled) root.selectYear(props.value); },
        role: 'gridcell', 'aria-selected': String(state.value.selected || state.value.inRange),
        'aria-disabled': String(state.value.disabled),
        'aria-current': state.value.current ? 'date' : undefined,
        'data-sectile-picker-year': String(props.value.year),
        'data-scope': root.scope, 'data-part': part, 'data-selected': state.value.selected ? '' : undefined,
        'data-in-range': state.value.inRange ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
        'data-current': state.value.current ? '' : undefined,
      }), { default: () => slots['default']?.(state.value) });
    },
  });
}

export const PickerMonthCell = createPickerMonthCell();
export const PickerYearCell = createPickerYearCell();

export function createPickerInput(part: PickerInputPart, name: string, type: 'text' | 'hidden' = 'text') {
  return defineComponent({
    name, inheritAttrs: false,
    props: { name: { type: String, default: undefined }, form: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } },
    setup(props, { attrs }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild,
      elementRef: (node: unknown) => root.register(part, node instanceof HTMLInputElement ? node : undefined),
      type, name: props.name, form: props.form, disabled: root.state.value.disabled,
      readOnly: root.granularity !== 'day' || root.state.value.readonly || part === 'start-input' || part === 'end-input' || part === 'start-date-time-input' || part === 'end-date-time-input',
      required: false, value: inputValue(root.kind, root.granularity, part, root.state.value.value),
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

export function createPickerViewTrigger(view: CalendarViewMode, name: string) {
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
function firstPickerInput(
  elements: ReadonlyMap<string, HTMLElement>,
  kind: PickerKind,
): HTMLInputElement | null {
  for (const part of inputParts(kind)) {
    const element = elements.get(part);
    if (element instanceof HTMLInputElement) return element;
  }
  return null;
}
function pickerFormSubmissions(
  elements: ReadonlyMap<string, HTMLElement>,
  kind: PickerKind,
): readonly FormSubmissionRegistration[] {
  const submission = (
    part: PickerInputPart,
    relativeName?: string,
  ): FormSubmissionRegistration | null => {
    const element = elements.get(part);
    if (!(element instanceof HTMLInputElement)) return null;
    return {
      element: () => element,
      ...(relativeName === undefined ? {} : { relativeName }),
      capabilities: hiddenInputSubmissionCapabilities,
    };
  };
  if (kind === 'calendar' || kind === 'date') return compactSubmissions(submission('input'));
  if (kind === 'date-range') {
    return compactSubmissions(
      submission('start-input', 'start'),
      submission('end-input', 'end'),
    );
  }
  if (kind === 'date-time') {
    const combined = submission('date-time-input');
    return combined === null
      ? compactSubmissions(submission('date-input', 'date'), submission('time-input', 'time'))
      : [combined];
  }
  const combinedStart = submission('start-date-time-input', 'start');
  const combinedEnd = submission('end-date-time-input', 'end');
  return compactSubmissions(
    combinedStart ?? submission('start-date-input', 'start.date'),
    combinedStart === null ? submission('start-time-input', 'start.time') : null,
    combinedEnd ?? submission('end-date-input', 'end.date'),
    combinedEnd === null ? submission('end-time-input', 'end.time') : null,
  );
}
function compactSubmissions(
  ...submissions: readonly (FormSubmissionRegistration | null)[]
): readonly FormSubmissionRegistration[] {
  return submissions.filter((submission): submission is FormSubmissionRegistration => submission !== null);
}
function monthFor(value: DateValue): readonly (readonly DateValue[])[] {
  return createCalendarMonth({ year: value.year, month: value.month });
}
function yearFor(year: number): readonly (readonly CalendarMonthValue[])[] {
  return createCalendarYear(year);
}
function yearsFrom(start: number, pageSize: number): readonly (readonly PickerYearValue[])[] {
  const columns = 4;
  return Array.from({ length: Math.ceil(pageSize / columns) }, (_row, rowIndex) =>
    Array.from({ length: columns }, (_column, columnIndex) => Object.freeze({ year: start + rowIndex * columns + columnIndex })),
  );
}
function pageStartContaining(year: number, currentStart: number, pageSize: number): number {
  if (year < currentStart) return currentStart - Math.ceil((currentStart - year) / pageSize) * pageSize;
  if (year >= currentStart + pageSize) return currentStart + Math.floor((year - currentStart) / pageSize) * pageSize;
  return currentStart;
}
interface PeriodPolicies {
  readonly min?: DateValue;
  readonly max?: DateValue;
  readonly unavailable?: (value: DateValue) => boolean;
}
function monthAvailable(value: CalendarMonthValue, policies: PeriodPolicies | undefined): boolean {
  const days = daysInMonth(value.year, value.month);
  for (let day = 1; day <= days; day += 1) {
    if (isCalendarValueAvailable({ year: value.year, month: value.month, day }, policies)) return true;
  }
  return false;
}
function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}
function dateOf(value: PickerValue): DateValue | null { if (value === null) return null; if ('year' in value) return value; if ('date' in value) return value.date; const start = value.start; return 'date' in start ? start.date : start; }
function extractState(kind: PickerKind, raw: unknown): { value: PickerValue; highlighted: DateValue; open: boolean; view: { readonly year: number; readonly month: number }; viewMode: CalendarViewMode } {
  const state = raw as Record<string, unknown>;
  if (kind === 'calendar') return { value: state['value'] as PickerValue, highlighted: state['highlighted'] as DateValue, open: true, view: state['view'] as { readonly year: number; readonly month: number }, viewMode: state['viewMode'] as CalendarViewMode };
  if (kind === 'date') return { value: state['value'] as PickerValue, highlighted: state['highlighted'] as DateValue, open: state['open'] as boolean, view: state['view'] as { readonly year: number; readonly month: number }, viewMode: state['viewMode'] as CalendarViewMode };
  const calendar = state['calendar'] as Record<string, unknown>;
  return { value: state['value'] as PickerValue, highlighted: calendar['highlighted'] as DateValue, open: calendar['open'] as boolean, view: calendar['view'] as { readonly year: number; readonly month: number }, viewMode: calendar['viewMode'] as CalendarViewMode };
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
function inputValue(kind: PickerKind, granularity: Context['granularity'], part: PickerInputPart, value: PickerValue): string {
  if (value === null) return '';
  const formatPeriod = (date: DateValue): string => granularity === 'year'
    ? String(date.year)
    : granularity === 'month'
      ? `${String(date.year).padStart(4, '0')}-${String(date.month).padStart(2, '0')}`
      : formatDateValue(date);
  if (kind === 'calendar' || kind === 'date') return formatPeriod(value as DateValue);
  if (kind === 'date-time') {
    const dateTime = value as DateTimeValue;
    return part === 'time-input' ? formatTimeValue(dateTime.time) : part === 'date-input' ? formatDateValue(dateTime.date) : formatDateTimeValue(dateTime);
  }
  const range = value as DateRange | DateTimeRange; const endpoint = part.startsWith('start') ? range.start : range.end;
  if ('date' in endpoint) return part.endsWith('time-input') && !part.includes('date-time') ? formatTimeValue(endpoint.time) : part.endsWith('date-input') ? formatDateValue(endpoint.date) : formatDateTimeValue(endpoint);
  return formatPeriod(endpoint);
}
function monthContainsValue(value: PickerValue, month: CalendarMonthValue): boolean { const date = dateOf(value); return date !== null && date.year === month.year && date.month === month.month; }
function yearContainsValue(value: PickerValue, year: PickerYearValue): boolean { const date = dateOf(value); return date !== null && date.year === year.year; }
function periodInRange(value: PickerValue, start: DateValue, end: DateValue): boolean {
  if (value === null || 'year' in value || 'date' in value) return false;
  const rangeStart = 'date' in value.start ? value.start.date : value.start;
  const rangeEnd = 'date' in value.end ? value.end.date : value.end;
  return compare(rangeStart, end) <= 0 && compare(start, rangeEnd) <= 0;
}
function inputParts(kind: PickerKind): readonly PickerInputPart[] { return kind === 'calendar' || kind === 'date' ? ['input'] : kind === 'date-range' ? ['start-input', 'end-input'] : kind === 'date-time' ? ['date-time-input', 'date-input', 'time-input'] : ['start-date-time-input', 'end-date-time-input', 'start-date-input', 'end-date-input', 'start-time-input', 'end-time-input']; }
function toDOMInputKey(part: PickerInputPart): string {
  if (part === 'date-time-input') return 'dateTimeInput';
  if (part === 'start-date-time-input') return 'startDateTimeInput';
  if (part === 'end-date-time-input') return 'endDateTimeInput';
  return part.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}
