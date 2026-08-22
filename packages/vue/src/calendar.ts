import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createCalendar, type CalendarConnection, type CalendarPolicies } from '@sectile/dom/calendar';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface CalendarRootProps { readonly rows: readonly (readonly string[])[]; readonly modelValue?: string | null; readonly defaultValue?: string | null; readonly highlightedValue?: string | null; readonly defaultHighlightedValue?: string | null; readonly disabledValues?: readonly string[]; readonly disabled?: boolean; readonly label?: string; readonly policies?: CalendarPolicies<string>; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface CalendarRootSlotProps { readonly value: string | null; readonly highlightedValue: string | null; readonly rows: readonly (readonly string[])[]; readonly disabled: boolean }
export interface CalendarCellProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface CalendarCellSlotProps { readonly value: string; readonly selected: boolean; readonly highlighted: boolean; readonly disabled: boolean; readonly rowIndex: number; readonly columnIndex: number }
interface Context { readonly state: ComputedRef<CalendarRootSlotProps>; readonly disabledValues: ComputedRef<ReadonlySet<string>>; register(element: HTMLElement, value: string, disabled: boolean): void }
const key = Symbol('SectileCalendarRoot');

export const CalendarRoot = defineComponent({
  name: 'SectileCalendarRoot', inheritAttrs: false,
  props: {
    rows: { type: Array as PropType<readonly (readonly string[])[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: null },
    highlightedValue: { type: String as PropType<string | null>, default: undefined }, defaultHighlightedValue: { type: String as PropType<string | null>, default: null },
    disabledValues: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false },
    label: { type: String, default: undefined }, policies: { type: Object as PropType<CalendarPolicies<string>>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, 'update:highlightedValue': (_value: string | null): boolean => true, page: (_details: { direction: -1 | 1; from: string | null }): boolean => true },
  slots: Object as SlotsType<{ default: (props: CalendarRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>(); const connection = shallowRef<CalendarConnection<string>>();
    const value = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue);
    const highlighted = shallowRef<string | null>(props.highlightedValue !== undefined ? props.highlightedValue : props.defaultHighlightedValue);
    const controlled = { value: props.modelValue !== undefined, highlighted: props.highlightedValue !== undefined };
    const state = computed<CalendarRootSlotProps>(() => ({
      value: props.modelValue !== undefined ? props.modelValue : value.value,
      highlightedValue: props.highlightedValue !== undefined ? props.highlightedValue : highlighted.value,
      rows: props.rows, disabled: props.disabled,
    }));
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; value.value = snapshot.selection.selected[0] ?? null; highlighted.value = snapshot.cursor.current; refreshCells(); };
    const refreshCells = (): void => { if (root.value === undefined || connection.value === undefined) return; root.value.querySelectorAll<HTMLElement>('[data-sectile-calendar-id]').forEach((element) => { const id = element.dataset['sectileCalendarId']; if (id === undefined) return; const rowIndex = Number(element.dataset['rowIndex']); const columnIndex = Number(element.dataset['columnIndex']); connection.value?.setCellAttributes(element, { id, rowIndex, columnIndex, disabled: props.disabledValues.includes(id) }); }); };
    const connect = (): void => {
      connection.value?.disconnect(); if (root.value === undefined) return;
      connection.value = createCalendar({
        root: root.value, rows: props.rows, disabled: props.disabled,
        ...(props.policies === undefined ? {} : { policies: { ...props.policies, eligible: (id: string) => !props.disabledValues.includes(id) && (props.policies?.eligible?.(id) ?? true) } }),
        ...(controlled.value ? { value: props.modelValue as string | null } : { defaultValue: value.value }),
        ...(controlled.highlighted ? { highlightedValue: props.highlightedValue as string | null } : { defaultHighlightedValue: highlighted.value }),
        onValueChange: ({ value: next }) => { value.value = next; emit('update:modelValue', next); },
        onHighlightedValueChange: ({ value: next }) => { highlighted.value = next; emit('update:highlightedValue', next); },
        onPageRequest: (details) => emit('page', details), onUpdate: refresh,
      }); connection.value.setCalendarAttributes(props.label); refreshCells(); refresh();
    };
    provide<Context>(key, { state, disabledValues: computed(() => new Set(props.disabledValues)), register: (element, id, disabled) => { const rowIndex = props.rows.findIndex((row) => row.includes(id)); const columnIndex = rowIndex < 0 ? -1 : props.rows[rowIndex]?.indexOf(id) ?? -1; connection.value?.setCellAttributes(element, { id, rowIndex: rowIndex + 1, columnIndex: columnIndex + 1, disabled }); } });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.rows, () => props.disabledValues, () => props.disabled, () => props.label, () => props.policies], connect);
    watch([() => props.modelValue, () => props.highlightedValue], () => { if (connection.value === undefined) return; const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue as string | null } : {}), ...(controlled.highlighted ? { highlightedValue: props.highlightedValue as string | null } : {}) }); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
      role: 'grid', 'aria-rowcount': props.rows.length, 'aria-colcount': Math.max(0, ...props.rows.map((row) => row.length)), 'aria-label': props.label,
      'data-scope': 'calendar', 'data-part': 'root', 'data-disabled': props.disabled ? '' : undefined,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export const CalendarCell = defineComponent({
  name: 'SectileCalendarCell', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: CalendarCellSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot(); const position = computed(() => { const rowIndex = root.state.value.rows.findIndex((row) => row.includes(props.value)); return { rowIndex, columnIndex: rowIndex < 0 ? -1 : root.state.value.rows[rowIndex]?.indexOf(props.value) ?? -1 }; }); const state = computed<CalendarCellSlotProps>(() => ({ value: props.value, selected: root.state.value.value === props.value, highlighted: root.state.value.highlightedValue === props.value, disabled: root.state.value.disabled || props.disabled || root.disabledValues.value.has(props.value), rowIndex: position.value.rowIndex, columnIndex: position.value.columnIndex })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.register(node, props.value, state.value.disabled); },
    role: 'gridcell', 'aria-rowindex': position.value.rowIndex + 1, 'aria-colindex': position.value.columnIndex + 1,
    'aria-selected': String(state.value.selected), disabled: state.value.disabled && props.as === 'button' ? true : undefined,
    'data-sectile-calendar-id': props.value, 'data-row-index': position.value.rowIndex + 1, 'data-column-index': position.value.columnIndex + 1,
    'data-scope': 'calendar', 'data-part': 'cell', 'data-selected': state.value.selected ? '' : undefined, 'data-highlighted': state.value.highlighted ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

function useRoot(): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError('CalendarCell must be used inside CalendarRoot.'); return root; }
