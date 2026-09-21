import { computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide, shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createColorPicker, formatColorValue, parseColorValue, type ColorAreaValue, type ColorChannel, type ColorCoordinate, type ColorCoordinateValue, type ColorFormat, type ColorModel, type ColorPickerConnection, type ColorPickerPolicies, type ColorValue } from '@sectile/dom/color-picker';
import {
  hiddenInputSubmissionCapabilities,
  useCompositeFormControl,
} from './form/control.js';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface ColorPickerRootProps extends ColorPickerPolicies {
  readonly modelValue?: string;
  readonly defaultValue?: string;
  readonly draft?: string | null;
  readonly defaultDraft?: string | null;
  readonly format?: ColorFormat;
  readonly defaultFormat?: ColorFormat;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly label?: string;
  readonly name?: string;
  readonly form?: string;
  readonly required?: boolean;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface ColorPickerRootSlotProps { readonly value: ColorValue; readonly text: string; readonly cssColor: string; readonly draft: string | null; readonly format: ColorFormat; readonly channel: ColorChannel; readonly area: ColorAreaValue; readonly coordinates: readonly ColorCoordinateValue[]; readonly disabled: boolean; readonly: boolean }
export interface ColorPickerPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ColorPickerChannelInputProps extends ColorPickerPartProps { readonly channel: ColorChannel }
export interface ColorPickerFormatTriggerProps extends ColorPickerPartProps { readonly format: ColorFormat }
export interface ColorPickerCoordinateInputProps extends ColorPickerPartProps { readonly format: ColorModel; readonly coordinate: ColorCoordinate }
export type ColorPickerCoordinateSliderProps = ColorPickerCoordinateInputProps;

interface RootContext {
  readonly state: ComputedRef<ColorPickerRootSlotProps>;
  readonly allowAlpha: ComputedRef<boolean>;
  registerNative(element?: HTMLInputElement): void;
  registerText(element?: HTMLInputElement): void;
  registerChannel(element: HTMLInputElement | undefined, channel: ColorChannel): void;
  registerCoordinate(element: HTMLInputElement, format: ColorModel, coordinate: ColorCoordinate, kind: 'number' | 'range'): void;
  unregisterCoordinate(element: HTMLInputElement): void;
  registerArea(element?: HTMLElement): void;
  registerAreaThumb(element?: HTMLElement): void;
  registerHue(element?: HTMLInputElement): void;
  registerAlpha(element?: HTMLInputElement): void;
  registerSwatch(element?: HTMLElement): void;
  setTextComposing(composing: boolean): void;
  setFormat(format: ColorFormat): void;
}
const rootKey = Symbol('SectileColorPickerRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const ColorPickerRoot = defineComponent({
  name: 'SectileColorPickerRoot', inheritAttrs: false,
  props: {
    modelValue: { type: String, default: undefined }, defaultValue: { type: String, default: '#5b6df6' }, draft: { type: String as PropType<string | null>, default: undefined }, defaultDraft: { type: String as PropType<string | null>, default: null },
    format: { type: String as PropType<ColorFormat>, default: undefined }, defaultFormat: { type: String as PropType<ColorFormat>, default: 'hex' }, allowAlpha: { type: Boolean, default: true }, channelStep: { type: Number, default: 1 }, alphaStep: { type: Number, default: 17 },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, label: { type: String, default: undefined }, name: { type: String, default: undefined }, form: { type: String, default: undefined }, required: { type: Boolean, default: false },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string): boolean => true, 'update:draft': (_value: string | null): boolean => true, 'update:format': (_value: ColorFormat): boolean => true },
  slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const root = shallowRef<HTMLElement>(); const connection = shallowRef<ColorPickerConnection>(); const native = shallowRef<HTMLInputElement>(); const text = shallowRef<HTMLInputElement>(); const swatch = shallowRef<HTMLElement>(); const areaElement = shallowRef<HTMLElement>(); const areaThumb = shallowRef<HTMLElement>(); const hue = shallowRef<HTMLInputElement>(); const alpha = shallowRef<HTMLInputElement>(); const channels = new Map<ColorChannel, HTMLInputElement>(); const coordinates = new Map<HTMLInputElement, readonly [ColorModel, ColorCoordinate, 'number' | 'range']>();
    const submission = shallowRef<HTMLInputElement>();
    const participation = useCompositeFormControl({
      root: () => root.value ?? null,
      focusTarget: () => text.value ?? native.value ?? areaElement.value ?? root.value ?? null,
      submissions: [{
        element: () => submission.value ?? null,
        capabilities: hiddenInputSubmissionCapabilities,
      }],
    });
    const valueControlled = props.modelValue !== undefined; const draftControlled = props.draft !== undefined; const formatControlled = props.format !== undefined;
    const noDraftProposal = Symbol('no-draft-proposal');
    let proposedDraft: string | null | typeof noDraftProposal = noDraftProposal;
    let textComposing = false;
    let reconnectPending = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    const initialValue = parseInitial(props.modelValue ?? props.defaultValue); const value = shallowRef<ColorValue>(initialValue); const draft = shallowRef<string | null>(props.draft !== undefined ? props.draft : props.defaultDraft); const format = shallowRef<ColorFormat>(props.format ?? props.defaultFormat); const channel = shallowRef<ColorChannel>('red'); const textValue = shallowRef(props.modelValue ?? props.defaultValue); const cssColor = shallowRef('rgb(91, 109, 246)'); const area = shallowRef<ColorAreaValue>({ x: 0.604, y: 0.965, hue: 233, alpha: initialValue.alpha / 255 }); const coordinateValues = shallowRef<readonly ColorCoordinateValue[]>([]); const revision = shallowRef(0);
    const state = computed<ColorPickerRootSlotProps>(() => ({ value: value.value, text: textValue.value, cssColor: cssColor.value, draft: draft.value, format: format.value, channel: channel.value, area: area.value, coordinates: coordinateValues.value, disabled: props.disabled, readonly: props.readonly }));
    const refresh = (): void => { const target = connection.value; if (target === undefined) return; const snapshot = target.getSnapshot(); revision.value = snapshot.revision; value.value = snapshot.state.value; draft.value = snapshot.state.draft; format.value = snapshot.state.format; channel.value = snapshot.state.channel; textValue.value = target.getText(); cssColor.value = target.getCSSColor(); area.value = target.getAreaValue(); coordinateValues.value = target.getCoordinates(); };
    const syncControlledValues = (): void => {
      const target = connection.value;
      if (target === undefined) return;
      const result = target.syncControlledValues({
        ...(valueControlled ? { value: props.modelValue as string } : {}),
        ...(draftControlled ? { draft: props.draft as string | null } : {}),
        ...(formatControlled ? { format: props.format as ColorFormat } : {}),
      });
      if (!result.ok) throw new TypeError(result.error.message);
      refresh();
    };
    const connectParts = (): void => { const target = connection.value; if (target === undefined) return; if (native.value !== undefined) target.setNativeInputAttributes(native.value); if (text.value !== undefined) target.setTextInputAttributes(text.value); if (swatch.value !== undefined) target.setSwatchAttributes(swatch.value); if (areaElement.value !== undefined) target.setAreaAttributes(areaElement.value); if (areaThumb.value !== undefined) target.setAreaThumbAttributes(areaThumb.value); if (hue.value !== undefined) target.setHueInputAttributes(hue.value); if (alpha.value !== undefined) target.setAlphaInputAttributes(alpha.value); for (const [name, element] of channels) target.setChannelInputAttributes(element, name); for (const [element, [model, name, kind]] of coordinates) { if (kind === 'range') target.setCoordinateSliderAttributes(element, model, name); else target.setCoordinateInputAttributes(element, model, name); } };
    const connect = (): void => {
      connection.value?.disconnect(); if (root.value === undefined) return;
      connection.value = createColorPicker({ root: root.value, ...(valueControlled ? { value: props.modelValue as string } : { defaultValue: textValue.value }), ...(draftControlled ? { draft: proposedDraft === noDraftProposal ? props.draft as string | null : proposedDraft } : { defaultDraft: draft.value }), ...(formatControlled ? { format: props.format as ColorFormat } : { defaultFormat: format.value }), allowAlpha: props.allowAlpha, channelStep: props.channelStep, alphaStep: props.alphaStep, disabled: props.disabled, readOnly: props.readonly, ...(props.label === undefined ? {} : { label: props.label }), onValueChange: (next) => emit('update:modelValue', toHex(next)), onDraftChange: (next) => { emit('update:draft', next); if (!draftControlled) return; proposedDraft = next; const proposal = next; void nextTick(() => { if (connection.value === undefined || proposedDraft !== proposal) return; proposedDraft = noDraftProposal; syncControlledValues(); }); }, onFormatChange: (next) => emit('update:format', next), onUpdate: refresh });
      connectParts(); refresh();
    };
    const requestConnect = (): void => {
      if (textComposing) {
        reconnectPending = true;
        return;
      }
      connect();
    };
    const setTextComposing = (composing: boolean): void => {
      textComposing = composing;
      if (composing || !reconnectPending || reconnectTimer !== null) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (textComposing) return;
        reconnectPending = false;
        connect();
      }, 0);
    };
    provide<RootContext>(rootKey, { state, allowAlpha: computed(() => props.allowAlpha), registerNative: (element) => { native.value = element; if (element !== undefined) connection.value?.setNativeInputAttributes(element); }, registerText: (element) => { const changed = text.value !== element; text.value = element; if (changed && element !== undefined) connection.value?.setTextInputAttributes(element); }, registerChannel: (element, name) => { if (element === undefined) channels.delete(name); else { channels.set(name, element); connection.value?.setChannelInputAttributes(element, name); } }, registerCoordinate: (element, model, name, kind) => { coordinates.set(element, [model, name, kind]); if (kind === 'range') connection.value?.setCoordinateSliderAttributes(element, model, name); else connection.value?.setCoordinateInputAttributes(element, model, name); }, unregisterCoordinate: (element) => { coordinates.delete(element); }, registerArea: (element) => { areaElement.value = element; if (element !== undefined) connection.value?.setAreaAttributes(element); }, registerAreaThumb: (element) => { areaThumb.value = element; if (element !== undefined) connection.value?.setAreaThumbAttributes(element); }, registerHue: (element) => { hue.value = element; if (element !== undefined) connection.value?.setHueInputAttributes(element); }, registerAlpha: (element) => { alpha.value = element; if (element !== undefined) connection.value?.setAlphaInputAttributes(element); }, registerSwatch: (element) => { swatch.value = element; if (element !== undefined) connection.value?.setSwatchAttributes(element); }, setTextComposing, setFormat: (next) => { if (connection.value?.handleEvent({ type: 'set-format', format: next })) refresh(); } });
    onMounted(connect);
    onBeforeUnmount(() => {
      if (reconnectTimer !== null) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      reconnectPending = false;
      proposedDraft = noDraftProposal;
      connection.value?.disconnect();
    });
    watch([() => props.allowAlpha, () => props.channelStep, () => props.alphaStep, () => props.disabled, () => props.readonly, () => props.label], requestConnect);
    watch([() => props.modelValue, () => props.draft, () => props.format], () => {
      proposedDraft = noDraftProposal;
      syncControlledValues();
    });
    return (): VNodeChild => { const visual = h(Primitive, mergeProps(participation.controlProps.value, attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { root.value = element instanceof HTMLElement ? element : undefined; }, role: 'group', 'aria-label': props.label, 'aria-disabled': String(props.disabled), 'aria-readonly': String(props.readonly), 'data-scope': 'color-picker', 'data-part': 'root', 'data-format': state.value.format, 'data-channel': state.value.channel, 'data-revision': String(revision.value) }), { default: () => slots['default']?.(state.value) }); if (props.name === undefined && props.form === undefined && !props.required && !participation.participating) return visual; return [visual, h('input', { ref: (element: unknown) => { submission.value = element instanceof HTMLInputElement ? element : undefined; }, type: 'hidden', name: props.name, form: props.form, required: props.required, disabled: props.disabled, value: state.value.text })]; };
  },
});

export type ColorPickerValueChangeHandler = (value: string) => void;
export type ColorPickerDraftChangeHandler = (value: string | null) => void;
export type ColorPickerFormatChangeHandler = (value: ColorFormat) => void;

export const ColorPickerLabel = simplePart('Label', 'label', 'label');
export const ColorPickerControl = simplePart('Control', 'control', 'div');
export const ColorPickerNativeInput = inputPart('NativeInput', 'native-input', (root, element) => root.registerNative(element));
export const ColorPickerTextInput = inputPart('TextInput', 'text-input', (root, element) => root.registerText(element));
export const ColorPickerChannelInput = defineComponent({ name: 'SectileColorPickerChannelInput', inheritAttrs: false, props: { channel: { type: String as PropType<ColorChannel>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerChannelInput'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => root.registerChannel(element instanceof HTMLInputElement ? element : undefined, props.channel), type: 'range', min: 0, max: 255, step: 1, value: root.state.value.value[props.channel], disabled: root.state.value.disabled || (props.channel === 'alpha' && !root.allowAlpha.value), 'aria-label': `${props.channel} channel`, 'data-scope': 'color-picker', 'data-part': 'channel-input', 'data-channel': props.channel }), { default: () => slots['default']?.(root.state.value) }); } });
export const ColorPickerCoordinateInput = coordinatePart('CoordinateInput', 'coordinate-input', 'number');
export const ColorPickerCoordinateSlider = coordinatePart('CoordinateSlider', 'coordinate-slider', 'range');
export const ColorPickerArea = defineComponent({ name: 'SectileColorPickerArea', inheritAttrs: false, props: partProps, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerArea'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => root.registerArea(element instanceof HTMLElement ? element : undefined), tabindex: root.state.value.disabled ? -1 : 0, 'aria-label': 'Color saturation and brightness', 'aria-readonly': String(root.state.value.readonly), 'data-scope': 'color-picker', 'data-part': 'area', style: { '--sectile-color-area-hue': `hsl(${root.state.value.area.hue} 100% 50%)` } }), { default: () => slots['default']?.(root.state.value) }); } });
export const ColorPickerAreaThumb = defineComponent({ name: 'SectileColorPickerAreaThumb', inheritAttrs: false, props: { ...partProps, as: { ...partProps.as, default: 'span' } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerAreaThumb'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => root.registerAreaThumb(element instanceof HTMLElement ? element : undefined), 'aria-hidden': 'true', 'data-scope': 'color-picker', 'data-part': 'area-thumb', style: { '--sectile-color-area-x': `${root.state.value.area.x * 100}%`, '--sectile-color-area-y': `${(1 - root.state.value.area.y) * 100}%`, backgroundColor: root.state.value.cssColor } }), { default: () => slots['default']?.(root.state.value) }); } });
export const ColorPickerHueSlider = inputPart('HueSlider', 'hue-slider', (root, element) => root.registerHue(element));
export const ColorPickerAlphaSlider = inputPart('AlphaSlider', 'alpha-slider', (root, element) => root.registerAlpha(element));
export const ColorPickerSwatch = defineComponent({ name: 'SectileColorPickerSwatch', inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerSwatch'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => root.registerSwatch(element instanceof HTMLElement ? element : undefined), style: { backgroundColor: root.state.value.cssColor }, 'aria-label': root.state.value.text, 'data-scope': 'color-picker', 'data-part': 'swatch' }), { default: () => slots['default']?.(root.state.value) }); } });
export const ColorPickerValueText = defineComponent({ name: 'SectileColorPickerValueText', inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'span' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerValueText'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'color-picker', 'data-part': 'value-text' }), { default: () => slots['default']?.(root.state.value) ?? root.state.value.text }); } });
export const ColorPickerFormatTrigger = defineComponent({ name: 'SectileColorPickerFormatTrigger', inheritAttrs: false, props: { format: { type: String as PropType<ColorFormat>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot('ColorPickerFormatTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled || root.state.value.readonly, 'aria-pressed': String(root.state.value.format === props.format), 'data-scope': 'color-picker', 'data-part': 'format-trigger', 'data-state': root.state.value.format === props.format ? 'active' : 'inactive', onClick: (event: MouseEvent) => { if (!event.defaultPrevented) root.setFormat(props.format); } }), { default: () => slots['default']?.(root.state.value) }); } });

function simplePart(name: string, part: string, as: PrimitiveAs) { return defineComponent({ name: `SectileColorPicker${name}`, inheritAttrs: false, props: { ...partProps, as: { ...partProps.as, default: as } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(`ColorPicker${name}`); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'color-picker', 'data-part': part }), { default: () => slots['default']?.(root.state.value) }); } }); }
function coordinatePart(name: string, part: string, kind: 'number' | 'range') { return defineComponent({ name: `SectileColorPicker${name}`, inheritAttrs: false, props: { format: { type: String as PropType<ColorModel>, required: true }, coordinate: { type: String as PropType<ColorCoordinate>, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(`ColorPicker${name}`); let registered: HTMLInputElement | undefined; onBeforeUnmount(() => { if (registered !== undefined) root.unregisterCoordinate(registered); }); return (): VNodeChild => { const entry = root.state.value.coordinates.find((item) => item.coordinate === props.coordinate); return h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { const next = element instanceof HTMLInputElement ? element : undefined; if (registered !== undefined && registered !== next) root.unregisterCoordinate(registered); registered = next; if (next !== undefined) root.registerCoordinate(next, props.format, props.coordinate, kind); }, type: kind, min: entry?.min, max: entry?.max, step: entry?.step, value: entry?.value, disabled: root.state.value.disabled || (props.coordinate === 'alpha' && !root.allowAlpha.value), readonly: kind === 'number' ? root.state.value.readonly : undefined, 'aria-readonly': String(root.state.value.readonly), 'aria-label': entry?.label ?? props.coordinate, 'aria-valuetext': entry === undefined ? undefined : `${entry.value}${entry.unit}`, 'data-scope': 'color-picker', 'data-part': part, 'data-coordinate': props.coordinate, 'data-format': props.format, style: { '--sectile-color-coordinate-color': root.state.value.cssColor } }), { default: () => slots['default']?.(root.state.value) }); }; } }); }
function inputPart(name: string, part: string, register: (root: RootContext, element?: HTMLInputElement) => void) { return defineComponent({ name: `SectileColorPicker${name}`, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'input' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: ColorPickerRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(`ColorPicker${name}`); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => register(root, element instanceof HTMLInputElement ? element : undefined), disabled: root.state.value.disabled, readonly: name === 'TextInput' ? root.state.value.readonly : undefined, 'aria-readonly': String(root.state.value.readonly), ...(name === 'TextInput' ? { onCompositionstart: () => root.setTextComposing(true), onCompositionend: () => root.setTextComposing(false) } : {}), 'data-scope': 'color-picker', 'data-part': part }), { default: () => slots['default']?.(root.state.value) }); } }); }
function useRoot(part: string): RootContext { const root = inject<RootContext>(rootKey); if (root === undefined) throw new TypeError(`${part} must be used inside ColorPickerRoot.`); return root; }
function parseInitial(text: string): ColorValue { const result = parseColorValue(text); return result.ok ? result.value : Object.freeze({ red: 0, green: 0, blue: 0, alpha: 255 }); }
function toHex(value: ColorValue): string { const result = formatColorValue(value, 'hex'); return result.ok ? result.value : '#000000'; }

export type { ColorAreaValue, ColorChannel, ColorCoordinate, ColorCoordinateValue, ColorFormat, ColorModel, ColorPickerPolicies, ColorValue } from '@sectile/dom/color-picker';
