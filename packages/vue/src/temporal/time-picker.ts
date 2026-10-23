import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, provide, shallowRef,
  type ComponentObjectPropsOptions, type ComputedRef, type DefineSetupFnComponent,
  type EmitsToProps, type PropType, type PublicProps, type SlotsType, type VNodeChild,
} from 'vue';
import { unwrap } from '@sectile/core/result';
import {
  createTimePicker, type TimePicker as ChoiceModel, type TimePickerChoice,
  type TimePickerColumn as ChoiceColumn, type TimePickerState,
} from '@sectile/temporal/time-picker';
import {
  tryCreateTimeFieldState, type TimeFieldFormatPart, type TimeFieldPolicies,
  type TimeFieldPrecision, type TimeValue,
} from '@sectile/temporal/time-field';
import type { InteractOutsideEvent, PopupCloseReason } from '@sectile/dom/popover';
import { createComponentHandle } from '../component-handle.js';
import { provideFormBoundary } from '../form/context.js';
import {
  hiddenInputSubmissionCapabilities, provideFormControlReset, useFormFieldDefaults,
  useFormMetadataPresence, useFormSubmissionProps,
} from '../form/control.js';
import { useHostActive } from '../host-provider.js';
import { provideNativeFieldValueControl, type NativeFieldValueControl } from '../input/native-field.js';
import { sameIDs } from '../internal/collection.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { ListboxRoot, ListboxItem, type ListboxItemSlotProps, type ListboxRootSlotProps } from '../listbox.js';
import {
  PopoverRoot, PopoverContent, type PopoverRootProps, type PopoverRootSlotProps,
  type PopoverRootExpose, type PopoverPartProps,
} from '../overlay/popover.js';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { TimeField } from './time-field.js';
import { useTimePresentation } from './internal/time-presentation.js';

export type TimePickerPart = TimeFieldFormatPart;
export type TimePickerColumnState = ChoiceColumn;
export type { TimeValue, TimePickerChoice };
export interface TimePickerRootProps extends Omit<PopoverRootProps, 'disabled'> {
  readonly modelValue?: TimeValue | null;
  readonly defaultValue?: TimeValue | null;
  readonly policies?: TimeFieldPolicies;
  readonly precision?: TimeFieldPrecision;
  readonly name?: string | undefined;
  readonly form?: string | undefined;
  readonly disabled?: boolean | undefined;
  readonly readonly?: boolean | undefined;
  readonly required?: boolean | undefined;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface TimePickerExpose {
  readonly element: HTMLInputElement | null;
  focus(options?: FocusOptions): void;
  select(): void;
  requestClose(): void;
  selectChoice(part: TimePickerPart, choice: number): boolean;
}
export interface TimePickerRootSlotProps extends Omit<PopoverRootSlotProps, 'disabled'> {
  readonly value: TimeValue | null;
  readonly parts: readonly TimePickerPart[];
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly required: boolean;
  readonly composing: boolean;
  readonly selectChoice: TimePickerExpose['selectChoice'];
}
export type TimePickerRootSlots = { default: (state: TimePickerRootSlotProps) => VNodeChild };
export type TimePickerRootEmits = {
  'update:modelValue': [value: TimeValue | null];
  'update:open': [open: boolean];
  closeRequest: [reason: PopupCloseReason];
  afterClose: [];
  interactOutside: [event: InteractOutsideEvent];
};
export interface TimePickerInputProps { readonly label?: string }
export type TimePickerInputExpose = Pick<TimePickerExpose, 'element' | 'focus' | 'select'>;
export interface TimePickerContentSlotProps {
  readonly value: TimeValue | null;
  readonly columns: readonly TimePickerColumnState[];
  readonly disabled: boolean;
  readonly readonly: boolean;
  readonly composing: boolean;
}
export type TimePickerContentSlots = { default: (state: TimePickerContentSlotProps) => VNodeChild };
export interface TimePickerColumnProps extends PopoverPartProps {
  readonly part: TimePickerPart;
  readonly label: string;
  /** IDs of currently rendered choices; selection still uses the full column. */
  readonly renderedChoices?: readonly number[] | undefined;
}
export interface TimePickerColumnSlotProps {
  readonly part: TimePickerPart;
  readonly choices: readonly TimePickerChoice[];
  readonly selected: number | null;
  readonly highlighted: number | null;
  readonly disabled: boolean;
  readonly readonly: boolean;
}
export type TimePickerColumnSlots = { default: (state: TimePickerColumnSlotProps) => VNodeChild };
export type TimePickerColumnEmits = { highlight: [choice: number | null]; activate: [choice: number] };
export interface TimePickerItemProps extends PopoverPartProps { readonly value: number }
export interface TimePickerItemSlotProps {
  readonly choice: TimePickerChoice;
  readonly selected: boolean;
  readonly highlighted: boolean;
  readonly disabled: boolean;
}
export type TimePickerItemSlots = { default: (state: TimePickerItemSlotProps) => VNodeChild };

interface ColumnMetadata {
  readonly part: TimePickerPart;
  readonly items: readonly string[];
  readonly textValue: (id: string) => string;
}
interface PickerContext {
  readonly value: ComputedRef<TimeValue | null>;
  readonly state: ComputedRef<TimePickerState>;
  readonly metadata: ComputedRef<readonly ColumnMetadata[]>;
  readonly disabled: ComputedRef<boolean>;
  readonly readonly: ComputedRef<boolean>;
  readonly composing: ComputedRef<boolean>;
  readonly inputProps: ComputedRef<Readonly<Record<string, unknown>>>;
  readonly view: TimePickerExpose;
  attach(control: NativeFieldValueControl<TimeValue>): () => void;
  registerInput(): () => void;
  publish(value: TimeValue | null): boolean;
}
interface ColumnContext { readonly column: ComputedRef<ChoiceColumn> }
interface LivePicker {
  readonly input: NativeFieldValueControl<TimeValue> | null;
  readonly popup: PopoverRootExpose | null;
  selectChoice(part: TimePickerPart, choice: number): boolean;
}
const pickerKey = Symbol('SectileTimePicker');
const columnKey = Symbol('SectileTimePickerColumn');
const emptyIDs: readonly string[] = Object.freeze([]);

function usePicker(): PickerContext {
  const context = inject<PickerContext | undefined>(pickerKey, undefined);
  if (context === undefined) throw new TypeError('TimePicker parts require TimePickerRoot.');
  return context;
}
function projectView(current: () => LivePicker | null): TimePickerExpose {
  return {
    get element() { return current()?.input?.element ?? null; },
    focus(options) { current()?.input?.element?.focus(options); },
    select() { current()?.input?.element?.select(); },
    requestClose() { current()?.popup?.requestClose(); },
    selectChoice(part, choice) { return current()?.selectChoice(part, choice) ?? false; },
  };
}
function inputView(view: TimePickerExpose): TimePickerInputExpose {
  return { get element() { return view.element; }, focus: view.focus, select: view.select };
}
function columnMetadata(model: ChoiceModel): readonly ColumnMetadata[] {
  return Object.freeze(unwrap(model.resolve(null)).columns.map(column => {
    const labels = column.choices.map(choice => choice.label);
    return Object.freeze({ part: column.part, items: Object.freeze(column.choices.map(choice => String(choice.id))),
      textValue: (id: string) => labels[Number(id)] ?? id });
  }));
}
function createTimePickerRoot() {
  const popupProps = (PopoverRoot as unknown as { readonly props: ComponentObjectPropsOptions<PopoverRootProps> }).props;
  const popupKeys = Object.keys(popupProps) as (keyof PopoverRootProps)[];
  return defineComponent<TimePickerRootProps, TimePickerRootEmits, string, SlotsType<TimePickerRootSlots>>(
    (props, { attrs, slots, emit, expose }) => {
      const controlled = useControlledStateInvariant('TimePickerRoot', 'modelValue', () => props.modelValue);
      const active = useHostActive(), inherited = useFormFieldDefaults(), explicit = useFormMetadataPresence();
      const presentation = useTimePresentation(props, format => format);
      const minimum = computed(() => props.policies?.min), maximum = computed(() => props.policies?.max);
      const model = computed(() => createTimePicker({
        ...(presentation.value === undefined ? {} : { format: presentation.value }),
        ...(minimum.value === undefined ? {} : { min: minimum.value }),
        ...(maximum.value === undefined ? {} : { max: maximum.value }),
      }));
      const initial = unwrap(tryCreateTimeFieldState((controlled ? props.modelValue : props.defaultValue) ?? null, undefined, model.value.format)).value;
      const local = shallowRef<TimeValue | null>(initial);
      const value = computed(() => unwrap(tryCreateTimeFieldState((controlled ? props.modelValue : local.value) ?? null, undefined, model.value.format)).value);
      const effective = (key: 'disabled' | 'readonly' | 'required'): boolean =>
        explicit.value.includes(key) ? props[key] === true : inherited?.value[key] ?? props[key] === true;
      const disabled = computed(() => !active.value || effective('disabled'));
      const readonly = computed(() => effective('readonly')), required = computed(() => effective('required'));
      const input = shallowRef<NativeFieldValueControl<TimeValue> | null>(null);
      const composing = computed(() => input.value?.composing.value ?? false);
      const state = computed(() => unwrap(model.value.resolve(value.value)));
      const metadata = computed(() => columnMetadata(model.value));
      let popup: PopoverRootExpose | null = null, inputs = 0, disposed = false;
      const handle = createComponentHandle<LivePicker, TimePickerExpose>(projectView);
      const publish = (next: TimeValue | null): boolean => {
        if (disposed || disabled.value || readonly.value || composing.value) return false;
        if (!controlled) local.value = next;
        emit('update:modelValue', next);
        return true;
      };
      handle.set({
        get input() { return input.value; }, get popup() { return popup; },
        selectChoice(part, choice) {
          if (disposed || disabled.value || readonly.value || composing.value) return false;
          const selected = model.value.select(value.value, part, choice);
          if (!selected.ok) return false;
          return input.value === null ? publish(selected.value) : input.value.commit(selected.value);
        },
      });
      expose(handle.view);
      provideFormControlReset(() => { if (!controlled && !disposed) local.value = initial; });
      const submission = useFormSubmissionProps({
        element: () => input.value?.element ?? null, capabilities: hiddenInputSubmissionCapabilities,
      });
      const inputProps = computed(() => {
        const result: Record<string, unknown> = {
          ...submission.value,
          modelValue: value.value, policies: props.policies, precision: props.precision ?? 'minute',
          disabled: disabled.value, readonly: readonly.value, required: required.value, label: props.label,
        };
        for (const key of ['name', 'form'] as const) if (explicit.value.includes(key)) result[key] = props[key];
        return result;
      });
      provide<PickerContext>(pickerKey, {
        value, state, metadata, disabled, readonly, composing, inputProps, view: handle.view, publish,
        attach(control) {
          input.value = control;
          return () => { if (input.value === control) input.value = null; };
        },
        registerInput() {
          if (inputs !== 0) throw new TypeError('TimePickerRoot accepts at most one TimePickerInput.');
          inputs++;
          return () => { inputs--; input.value = null; };
        },
      });
      onBeforeUnmount(() => { disposed = true; handle.release(); input.value = null; popup = null; });
      return () => {
        const forwarded: Record<string, unknown> = {};
        for (const key of popupKeys) if (props[key] !== undefined) forwarded[key] = props[key];
        return h(PopoverRoot, {
          ...forwarded, disabled: disabled.value, unmountOnExit: props.unmountOnExit ?? true,
          ref: (next: unknown) => { popup = next as PopoverRootExpose | null; },
          'onUpdate:open': (open: boolean) => { if (!disposed) emit('update:open', open); },
          onCloseRequest: (reason: PopupCloseReason) => { if (!disposed) emit('closeRequest', reason); },
          onAfterClose: () => { if (!disposed) emit('afterClose'); },
          onInteractOutside: (event: InteractOutsideEvent) => { if (!disposed) emit('interactOutside', event); },
        }, { default: (popupState: PopoverRootSlotProps) => h(Primitive, mergeProps(attrs, {
          as: props.as ?? 'div', asChild: props.asChild ?? false, role: 'group', 'aria-label': props.label,
          'data-scope': 'time-picker', 'data-part': 'root',
        }), { default: () => slots.default?.({ ...popupState, value: value.value, parts: model.value.format.order,
          disabled: disabled.value, readonly: readonly.value, required: required.value, composing: composing.value,
          selectChoice: handle.view.selectChoice }) }) });
      };
    }, {
      name: 'SectileTimePickerRoot', inheritAttrs: false,
      props: {
        ...popupProps,
        modelValue: { type: Object as PropType<TimeValue | null>, default: undefined },
        defaultValue: { type: Object as PropType<TimeValue | null>, default: null },
        policies: { type: Object as PropType<TimeFieldPolicies>, default: undefined },
        precision: { type: String as PropType<TimeFieldPrecision>, default: 'minute' },
        name: { type: String as PropType<string | undefined>, default: undefined },
        form: { type: String as PropType<string | undefined>, default: undefined },
        disabled: { type: Boolean, default: undefined }, readonly: { type: Boolean, default: undefined },
        required: { type: Boolean, default: undefined },
        as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
        asChild: { type: Boolean, default: false }, unmountOnExit: { type: Boolean, default: true },
      },
      emits: ['update:modelValue', 'update:open', 'closeRequest', 'afterClose', 'interactOutside'],
    },
  );
}
const Root = /* @__PURE__ */ createTimePickerRoot();
type RootProps = TimePickerRootProps & PublicProps & EmitsToProps<TimePickerRootEmits>;
type RootInstance = InstanceType<DefineSetupFnComponent<TimePickerRootProps, TimePickerRootEmits, SlotsType<TimePickerRootSlots>>> & TimePickerExpose;
export const TimePickerRoot: new (props: RootProps) => Omit<RootInstance, '$props'> & { readonly $props: RootProps } = Root as unknown as new (props: RootProps) => Omit<RootInstance, '$props'> & { readonly $props: RootProps };

const Input = /* @__PURE__ */ defineComponent<TimePickerInputProps>(
  (props, { attrs, expose }) => {
    const context = usePicker();
    const unregister = context.registerInput();
    onBeforeUnmount(unregister);
    provideNativeFieldValueControl<TimeValue>(context.attach);
    expose(inputView(context.view));
    return () => h(TimeField, mergeProps(attrs, context.inputProps.value, {
      ...(props.label === undefined ? {} : { label: props.label }),
      'onUpdate:modelValue': context.publish,
    }));
  }, { name: 'SectileTimePickerInput', inheritAttrs: false, props: { label: { type: String, default: undefined } } },
);
type InputInstance = InstanceType<DefineSetupFnComponent<TimePickerInputProps>> & TimePickerInputExpose;
export const TimePickerInput: new (props: TimePickerInputProps & PublicProps) => Omit<InputInstance, '$props'> & { readonly $props: TimePickerInputProps & PublicProps } = Input as unknown as new (props: TimePickerInputProps & PublicProps) => Omit<InputInstance, '$props'> & { readonly $props: TimePickerInputProps & PublicProps };

export const TimePickerContent = /* @__PURE__ */ defineComponent<PopoverPartProps, {}, string, SlotsType<TimePickerContentSlots>>(
  (props, { attrs, slots }) => {
    const context = usePicker();
    provideFormBoundary();
    return () => h(PopoverContent, mergeProps(attrs, { ...props }), {
      default: () => slots.default?.({ value: context.value.value, columns: context.state.value.columns,
        disabled: context.disabled.value, readonly: context.readonly.value, composing: context.composing.value }),
    });
  }, { name: 'SectileTimePickerContent', inheritAttrs: false, props: {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  } },
);

export const TimePickerColumn = /* @__PURE__ */ defineComponent<TimePickerColumnProps, TimePickerColumnEmits, string, SlotsType<TimePickerColumnSlots>>(
  (props, { attrs, slots, emit }) => {
    const context = usePicker();
    provideFormBoundary();
    const column = computed(() => {
      const found = context.state.value.columns.find(current => current.part === props.part);
      if (found === undefined) throw new TypeError('TimePickerColumn part must be visible in the current format.');
      return found;
    });
    const metadata = computed(() => context.metadata.value.find(current => current.part === props.part)!);
    const disabledItems = computed<readonly string[]>((previous) => {
      const next = column.value.choices.filter(choice => choice.disabled).map(choice => String(choice.id));
      return previous !== undefined && sameIDs(previous, next) ? previous : next.length === 0 ? emptyIDs : next;
    });
    const renderedItems = computed<readonly string[] | undefined>((previous) => {
      const next = props.renderedChoices?.map(String);
      return previous !== undefined && next !== undefined && sameIDs(previous, next) ? previous : next;
    });
    provide<ColumnContext>(columnKey, { column });
    return () => h(ListboxRoot, { ...attrs,
      items: metadata.value.items, textValue: metadata.value.textValue, disabledItems: disabledItems.value, renderedItems: renderedItems.value,
      modelValue: column.value.selected === null ? '' : String(column.value.selected),
      disabled: context.disabled.value, readonly: context.readonly.value || context.composing.value,
      as: props.as ?? 'div', asChild: props.asChild ?? false, 'aria-label': props.label,
      'data-scope': 'time-picker', 'data-part': 'column', 'data-time-part': props.part,
      onHighlight: (id: string | null) => emit('highlight', id === null ? null : Number(id)),
      onActivate: (id: string) => { if (context.view.selectChoice(props.part, Number(id))) emit('activate', Number(id)); },
    }, { default: (state: ListboxRootSlotProps) => slots.default?.({
      part: props.part, choices: column.value.choices, selected: column.value.selected,
      highlighted: state.highlightedValue === null ? null : Number(state.highlightedValue),
      disabled: state.disabled, readonly: state.readonly,
    }) });
  }, { name: 'SectileTimePickerColumn', inheritAttrs: false, props: {
    part: { type: String as PropType<TimePickerPart>, required: true }, label: { type: String, required: true },
    renderedChoices: { type: Array as PropType<readonly number[] | undefined>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  }, emits: ['highlight', 'activate'] },
);

export const TimePickerItem = /* @__PURE__ */ defineComponent<TimePickerItemProps, {}, string, SlotsType<TimePickerItemSlots>>(
  (props, { attrs, slots }) => {
    const context = inject<ColumnContext | undefined>(columnKey, undefined);
    if (context === undefined) throw new TypeError('TimePickerItem requires TimePickerColumn.');
    return () => {
      const choice = context.column.value.choices[props.value];
      if (choice === undefined) throw new TypeError('TimePickerItem value must be a choice ID from its column.');
      return h(ListboxItem, { ...attrs, value: String(choice.id), as: props.as ?? 'div', asChild: props.asChild ?? false,
        'data-scope': 'time-picker', 'data-part': 'item' }, {
        default: (state: ListboxItemSlotProps) => slots.default?.({ choice, selected: state.selected,
          highlighted: state.highlighted, disabled: state.disabled }) ?? choice.label,
      });
    };
  }, { name: 'SectileTimePickerItem', inheritAttrs: false, props: {
    value: { type: Number, required: true },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  } },
);

export {
  PopoverTrigger as TimePickerTrigger, PopoverAnchor as TimePickerAnchor,
  PopoverPortal as TimePickerPortal, PopoverTitle as TimePickerTitle,
  PopoverDescription as TimePickerDescription, PopoverClose as TimePickerClose,
} from '../overlay/popover.js';
export type { PopoverPartProps as TimePickerPartProps, PopoverPortalProps as TimePickerPortalProps } from '../overlay/popover.js';
