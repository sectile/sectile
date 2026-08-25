import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import {
  createCarousel,
  type CarouselAutoplayOptions,
  type CarouselConnection,
  type CarouselPolicies,
} from '@sectile/dom/carousel';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostDirection, useHostId } from './host-provider.js';

export interface CarouselRootProps {
  readonly slides: readonly string[];
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly paused?: boolean;
  readonly defaultPaused?: boolean;
  readonly disabled?: boolean;
  readonly orientation?: 'horizontal' | 'vertical';
  readonly autoplay?: boolean | CarouselAutoplayOptions;
  readonly policies?: CarouselPolicies;
  readonly label?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface CarouselRootSlotProps {
  readonly value: string | null;
  readonly index: number | null;
  readonly count: number;
  readonly paused: boolean;
  readonly disabled: boolean;
}
export interface CarouselSlideSlotProps extends CarouselRootSlotProps { readonly value: string; readonly active: boolean }
export interface CarouselPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<CarouselRootSlotProps>;
  register(part: 'root' | 'previous' | 'next' | 'pause' | 'indicators', element?: HTMLElement): void;
  registerSlide(element: HTMLElement, id: string): void;
  registerIndicator(element: HTMLElement, id: string): void;
}
const key = Symbol('SectileCarouselRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

export const CarouselRoot = defineComponent({
  name: 'SectileCarouselRoot', inheritAttrs: false,
  props: {
    slides: { type: Array as PropType<readonly string[]>, required: true },
    modelValue: { type: String as PropType<string | null>, default: undefined }, defaultValue: { type: String as PropType<string | null>, default: undefined },
    paused: { type: Boolean, default: undefined }, defaultPaused: { type: Boolean, default: false }, disabled: { type: Boolean, default: false },
    orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal' },
    autoplay: { type: [Boolean, Object] as PropType<boolean | CarouselAutoplayOptions>, default: false },
    policies: { type: Object as PropType<CarouselPolicies>, default: undefined }, label: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'section' }, asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: string | null): boolean => true, 'update:paused': (_value: boolean): boolean => true, announce: (_value: string): boolean => true },
  slots: Object as SlotsType<{ default: (props: CarouselRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const generatedID = `sectile-carousel-${useHostId()}`;
    const direction = useHostDirection();
    const elements = new Map<string, HTMLElement>(); const connection = shallowRef<CarouselConnection<string>>();
    const localValue = shallowRef<string | null>(props.modelValue !== undefined ? props.modelValue : props.defaultValue ?? props.slides[0] ?? null);
    const localPaused = shallowRef(props.paused ?? props.defaultPaused);
    const controlled = { value: props.modelValue !== undefined, paused: props.paused !== undefined };
    const state = computed<CarouselRootSlotProps>(() => {
      const value = props.modelValue !== undefined ? props.modelValue : localValue.value;
      const foundIndex = value === null ? -1 : props.slides.indexOf(value);
      return Object.freeze({ value, index: foundIndex < 0 ? null : foundIndex, count: props.slides.length, paused: props.paused ?? localPaused.value, disabled: props.disabled });
    });
    const refreshParts = (): void => {
      const root = elements.get('root'); if (root === undefined || connection.value === undefined) return;
      root.querySelectorAll<HTMLElement>('[data-sectile-carousel-slide]').forEach((element) => { const id = element.dataset['sectileCarouselSlide']; if (id !== undefined) connection.value?.setSlideAttributes(element, id); });
      root.querySelectorAll<HTMLElement>('[data-sectile-carousel-indicator]').forEach((element) => { const id = element.dataset['sectileCarouselIndicator']; if (id !== undefined) connection.value?.setIndicatorAttributes(element, id); });
    };
    const refresh = (): void => {
      const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return;
      localValue.value = snapshot.cursor.current; localPaused.value = snapshot.paused; refreshParts();
    };
    const connect = (): void => {
      connection.value?.disconnect(); const root = elements.get('root'); if (root === undefined) return;
      connection.value = createCarousel({
        root, slides: props.slides,
        ...(controlled.value ? { value: props.modelValue as string | null } : { defaultValue: localValue.value }),
        ...(controlled.paused ? { paused: props.paused as boolean } : { defaultPaused: localPaused.value }),
        disabled: props.disabled, orientation: props.orientation, direction: direction.value, autoplay: props.autoplay,
        ...(props.policies === undefined ? {} : { policies: props.policies }), ...(props.label === undefined ? {} : { label: props.label }),
        ...(elements.get('previous') === undefined ? {} : { previousButton: elements.get('previous') as HTMLElement }),
        ...(elements.get('next') === undefined ? {} : { nextButton: elements.get('next') as HTMLElement }),
        ...(elements.get('pause') === undefined ? {} : { pauseButton: elements.get('pause') as HTMLElement }),
        ...(elements.get('indicators') === undefined ? {} : { indicatorGroup: elements.get('indicators') as HTMLElement }),
        onValueChange: (value) => { localValue.value = value; emit('update:modelValue', value); },
        onPausedChange: (value) => { localPaused.value = value; emit('update:paused', value); },
        onAnnounce: (value) => emit('announce', value), onUpdate: refresh,
      });
      refreshParts(); refresh();
    };
    provide<Context>(key, {
      state,
      register: (part, element) => { if (element === undefined) elements.delete(part); else elements.set(part, element); },
      registerSlide: (element, id) => connection.value?.setSlideAttributes(element, id),
      registerIndicator: (element, id) => connection.value?.setIndicatorAttributes(element, id),
    });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.slides, () => props.disabled, () => props.orientation, () => props.autoplay, () => props.policies, () => props.label, direction], connect);
    watch([() => props.modelValue, () => props.paused], () => {
      if (connection.value === undefined) return;
      const result = connection.value.syncControlledValues({ ...(controlled.value ? { value: props.modelValue } : {}), ...(controlled.paused ? { paused: props.paused } : {}) });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) elements.set('root', node); },
      id: typeof attrs['id'] === 'string' ? attrs['id'] : generatedID,
      dir: direction.value,
      'data-scope': 'carousel', 'data-part': 'root', 'data-orientation': props.orientation,
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type CarouselValueChangeHandler = (value: string | null) => void;
export type CarouselPausedChangeHandler = (value: boolean) => void;
export type CarouselAnnounceHandler = (value: string) => void;

export const CarouselViewport = part('SectileCarouselViewport', 'viewport', 'div');
export const CarouselTrack = part('SectileCarouselTrack', 'track', 'div');
export const CarouselIndicatorGroup = registeredPart('SectileCarouselIndicatorGroup', 'indicators', 'indicator-group', 'div');
export const CarouselPrevious = registeredPart('SectileCarouselPrevious', 'previous', 'previous', 'button');
export const CarouselNext = registeredPart('SectileCarouselNext', 'next', 'next', 'button');
export const CarouselPause = registeredPart('SectileCarouselPause', 'pause', 'pause', 'button');

export const CarouselSlide = defineComponent({
  name: 'SectileCarouselSlide', inheritAttrs: false,
  props: { value: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: CarouselSlideSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('CarouselSlide'); const state = computed<CarouselSlideSlotProps>(() => ({ ...root.state.value, value: props.value, active: root.state.value.value === props.value })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerSlide(node, props.value); },
    hidden: !state.value.active, 'data-sectile-carousel-slide': props.value, 'data-scope': 'carousel', 'data-part': 'slide', 'data-state': state.value.active ? 'active' : 'inactive',
  }), { default: () => slots['default']?.(state.value) }); },
});

export const CarouselIndicator = defineComponent({
  name: 'SectileCarouselIndicator', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: CarouselSlideSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('CarouselIndicator'); const state = computed<CarouselSlideSlotProps>(() => ({ ...root.state.value, value: props.value, active: root.state.value.value === props.value })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
    elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerIndicator(node, props.value); },
    'data-sectile-carousel-indicator': props.value, 'data-scope': 'carousel', 'data-part': 'indicator', 'data-state': state.value.active ? 'active' : 'inactive',
  }), { default: () => slots['default']?.(state.value) }); },
});

function part(name: string, dataPart: string, defaultAs: PrimitiveAs) { return defineComponent({ name, inheritAttrs: false, props: { ...partProps, as: { ...partProps.as, default: defaultAs } }, slots: Object as SlotsType<{ default: (props: CarouselRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'carousel', 'data-part': dataPart }), { default: () => slots['default']?.(root.state.value) }); } }); }
function registeredPart(name: string, registration: 'previous' | 'next' | 'pause' | 'indicators', dataPart: string, defaultAs: PrimitiveAs) { return defineComponent({ name, inheritAttrs: false, props: { ...partProps, as: { ...partProps.as, default: defaultAs } }, slots: Object as SlotsType<{ default: (props: CarouselRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: props.as === 'button' ? root.state.value.disabled : undefined, elementRef: (node: unknown) => root.register(registration, node instanceof HTMLElement ? node : undefined), 'data-scope': 'carousel', 'data-part': dataPart }), { default: () => slots['default']?.(root.state.value) }); } }); }
function useRoot(partName: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${partName} must be used inside CarouselRoot.`); return root; }
