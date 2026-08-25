import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  provide,
  useId,
  type Component,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';

export type HostDirection = 'ltr' | 'rtl';
export type HostPortalTarget = string | HTMLElement;
export type HostIdGenerator = () => string;

export interface HostProviderProps {
  readonly direction?: HostDirection;
  readonly portalTarget?: HostPortalTarget;
  readonly createId?: HostIdGenerator;
}

interface HostContext {
  readonly direction: ComputedRef<HostDirection>;
  readonly portalTarget: ComputedRef<HostPortalTarget | undefined>;
  createId(): string;
}

const hostContextKey = Symbol('SectileHost');

export const HostProvider = defineComponent({
  name: 'SectileHostProvider',
  inheritAttrs: false,
  props: {
    direction: { type: String as PropType<HostDirection>, default: undefined },
    portalTarget: {
      type: [String, Object] as PropType<HostPortalTarget>,
      default: undefined,
    },
    createId: { type: Function as PropType<HostIdGenerator>, default: undefined },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { slots }) {
    const parent = inject<HostContext | undefined>(hostContextKey, undefined);
    const direction = computed(() => props.direction ?? parent?.direction.value ?? 'ltr');
    const portalTarget = computed(() => props.portalTarget ?? parent?.portalTarget.value);
    provide<HostContext>(hostContextKey, {
      direction,
      portalTarget,
      createId: () => props.createId?.() ?? parent?.createId() ?? useId(),
    });
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.() ?? []);
  },
});

export function useHostDirection(): ComputedRef<HostDirection> {
  const context = inject<HostContext | undefined>(hostContextKey, undefined);
  return context?.direction ?? computed(() => 'ltr');
}

export function useHostPortalTarget(): ComputedRef<HostPortalTarget | undefined> {
  const context = inject<HostContext | undefined>(hostContextKey, undefined);
  return context?.portalTarget ?? computed(() => undefined);
}

export function useHostId(): string {
  const context = inject<HostContext | undefined>(hostContextKey, undefined);
  return context?.createId() ?? useId();
}
