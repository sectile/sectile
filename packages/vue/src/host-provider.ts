import {
  Fragment,
  Teleport,
  computed,
  defineComponent,
  h,
  inject,
  onActivated,
  onBeforeUpdate,
  onDeactivated,
  onScopeDispose,
  onUpdated,
  provide,
  shallowRef,
  toValue,
  useId,
  type Component,
  type ComputedRef,
  type MaybeRefOrGetter,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { LayerHostConnection, LayerReservation } from '@sectile/dom/layer-host';
import type { DOMLayerPresentationSnapshot, PopupCloseReason } from '@sectile/dom/dialog';
import { usePortalMove, type PortalMoveConnection } from './internal/portal-move.js';

export type HostDirection = 'ltr' | 'rtl';
export type HostPortalTarget = string | HTMLElement;
export type HostIdGenerator = () => string;

export interface HostProviderProps {
  readonly direction?: HostDirection;
  readonly portalTarget?: HostPortalTarget;
  readonly createId?: HostIdGenerator;
  /** Undefined inherits the parent; null requires managed admission that is not yet available. */
  readonly layerHost?: MaybeRefOrGetter<LayerHostConnection | null | undefined>;
  /** Suspend native presentation without changing descendant accepted models. */
  readonly active?: MaybeRefOrGetter<boolean>;
}

interface HostContext {
  readonly direction: ComputedRef<HostDirection>;
  readonly portalTarget: ComputedRef<HostPortalTarget | undefined>;
  readonly layerHost: ComputedRef<LayerHostConnection | null | undefined>;
  readonly active: ComputedRef<boolean>;
  createId(): string;
}

const hostContextKey = Symbol('SectileHost');
const portalBoundaryKey = Symbol('SectileHostPortalBoundary');
const popupBindingKey = Symbol('SectileHostPopup');
const layerParentKey = Symbol('SectileHostLayerParent');

/** Borrow the logical ancestor across Portal without creating another layer owner. */
export interface HostLayerParent {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly open: Readonly<ShallowRef<boolean>>;
  readonly inline?: Readonly<ShallowRef<boolean>>;
  readonly element: Readonly<ShallowRef<HTMLElement | undefined>>;
  readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  readonly available: ComputedRef<boolean>;
}

export function provideHostLayerParent(parent: Omit<HostLayerParent, 'available'>): void {
  provide<HostLayerParent>(layerParentKey, {
    ...parent,
    available: computed(() => parent.active.value && (parent.inline?.value === true
      || (parent.open.value && (parent.presentation.value === undefined || parent.presentation.value.phase === 'active')))),
  });
}

export function useHostLayerParent(): HostLayerParent | undefined {
  return inject<HostLayerParent | undefined>(layerParentKey, undefined);
}

/** A scoped invocation observes the existing Dialog/Drawer owner, not its requests as state. */
export interface HostPopupBinding {
  /** A reserved root starts open so native construction consumes its initial slot. */
  readonly reservation?: LayerReservation;
  readonly restoreFocusTarget?: HTMLElement;
  attach(requestClose: () => void): void;
  onCloseRequest(reason: PopupCloseReason): void;
  onOpenChange(open: boolean): void;
  /** Actual native availability, distinct from the accepted open model. */
  onActiveChange?(active: boolean): void;
  onAfterClose(): void;
  /** The caller releases any reservation not consumed by native admission. */
  detach(): void;
}
interface HostPopupScope { binding: HostPopupBinding | undefined }

/** Bind one descendant Dialog/Drawer root; nested and sibling roots stay independent. */
export function provideHostPopup(binding: HostPopupBinding): void {
  provide<HostPopupScope>(popupBindingKey, { binding });
}

/** Claim the invocation binding once during the supported popup root's setup. */
export function useHostPopup(): HostPopupBinding | undefined {
  const scope = inject<HostPopupScope | undefined>(popupBindingKey, undefined);
  const binding = scope?.binding;
  if (scope !== undefined) {
    scope.binding = undefined;
    provide(popupBindingKey, undefined);
  }
  return binding;
}

export interface HostPortalProps {
  readonly to?: HostPortalTarget;
  readonly disabled?: boolean;
  readonly defer?: boolean;
}

/** Supply a logical boundary receiving HostPortalProps, without owning its target. */
export function provideHostPortal(boundary: Component): void {
  provide(portalBoundaryKey, boundary);
}

export const HostPortal = /* @__PURE__ */ defineComponent({
  name: 'SectileHostPortal', inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<HostPortalTarget>, default: undefined },
    disabled: { type: Boolean, default: false },
    defer: { type: Boolean, default: false },
  },
  setup(props, { slots }) {
    const target = useHostPortalTarget();
    const boundary = inject<Component | undefined>(portalBoundaryKey, undefined);
    const move = usePortalMove();
    let pending: PortalMoveConnection | undefined;
    let previousRequest: HostPortalTarget | undefined, previousDisabled = props.disabled;
    let destination: HostPortalTarget | undefined;
    onBeforeUpdate(() => {
      if ((props.to ?? target.value ?? 'body') === previousRequest && props.disabled === previousDisabled) return;
      pending?.completeMove(false); pending = move?.read?.(); pending?.prepareMove();
    });
    onUpdated(() => { const held = pending; pending = undefined; held?.completeMove(); });
    onScopeDispose(() => { const held = pending; pending = undefined; destination = undefined; previousRequest = undefined; held?.completeMove(false); });
    return (): VNodeChild => {
      const requested = props.to ?? target.value ?? 'body';
      previousRequest = requested; previousDisabled = props.disabled;
      // Disabled Teleport keeps its physical destination. Preserve the matching
      // prop so re-enabling with a changed request performs a real target move.
      const to = props.disabled ? destination ?? requested : requested;
      destination = to;
      return h(Teleport as Component, { to, disabled: props.disabled, defer: props.defer },
        boundary ? [h(boundary, { to: requested, disabled: props.disabled, defer: props.defer }, slots)] : slots['default']?.());
    };
  },
});

function provideHost(props: { readonly [K in keyof HostProviderProps]?: HostProviderProps[K] | undefined }): void {
  const parent = inject<HostContext | undefined>(hostContextKey, undefined);
  provide<HostContext>(hostContextKey, {
    direction: computed(() => props.direction ?? parent?.direction.value ?? 'ltr'),
    portalTarget: computed(() => props.portalTarget ?? parent?.portalTarget.value),
    layerHost: computed(() => props.layerHost === undefined ? parent?.layerHost.value : toValue(props.layerHost)),
    active: computed(() => (parent?.active.value ?? true) && (props.active === undefined || toValue(props.active))),
    createId: () => props.createId?.() ?? parent?.createId() ?? useId(),
  });
}

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
    layerHost: { type: [Object, Function] as PropType<MaybeRefOrGetter<LayerHostConnection | null | undefined>>, default: undefined },
    active: { type: [Boolean, Object, Function] as PropType<MaybeRefOrGetter<boolean>>, default: true },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { slots }) {
    provideHost(props);
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

export function useHostLayer(): ComputedRef<LayerHostConnection | null | undefined> {
  return inject<HostContext | undefined>(hostContextKey, undefined)?.layerHost ?? computed(() => undefined);
}

/** Supply layer admission in setup without adding a renderer boundary. */
export function provideHostLayer(layerHost: NonNullable<HostProviderProps['layerHost']> | null): void {
  provideHost({ layerHost });
}

/** Combine logical availability with this component's cached lifecycle. */
export function useHostActive(): ComputedRef<boolean> {
  const parent = inject<HostContext | undefined>(hostContextKey, undefined);
  const active = shallowRef(true);
  onDeactivated(() => { active.value = false; });
  onActivated(() => { active.value = true; });
  return computed(() => active.value && (parent?.active.value ?? true));
}

/** Propagate successful native availability to logical descendants. */
export function provideHostActive(active: NonNullable<HostProviderProps['active']>): void {
  provideHost({ active });
}
