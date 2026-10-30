import {
  Fragment,
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { TooltipGroup } from '@sectile/dom/tooltip';
import { positionProps, positionSources, readPositionOptions } from '../internal/position-options.js';
import type {
  PositionOptions,
  PositionStrategy,
} from '@sectile/dom/position';
import type { InteractOutsideEvent, InteractOutsideHandler } from '@sectile/dom';
import type { DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription, DOMLayerReparentErrorCode } from '@sectile/dom/dialog';
import type { PopupBehaviorErrorCode, PopupBehaviorOptions, PopupDismissalOptions } from '@sectile/dom/dialog';
import type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from '@sectile/dom/dialog';
import type { PopupPositionOptions } from '@sectile/dom/popover';
import type { DrawerGestureErrorCode, DrawerGestureOptions } from '@sectile/dom/drawer';
import { failResult, SectileResultError, unwrap, type Result } from '@sectile/core/result';
import type { LayerHostConnection, LayerHostTransferErrorCode, LayerReservation } from '@sectile/dom/layer-host';
import { Primitive, renderPrimitive, type PrimitiveAs } from '../primitive.js';
import { HostPortal, provideHostActive, provideHostLayerParent, useHostActive, useHostDirection, useHostId, useHostLayer, useHostLayerParent, useHostPopup } from '../host-provider.js';
import { usePresence } from '../presence/presence.js';
import { useControlledStateInvariant } from '../internal/controlled-state.js';
import { providePortalMove } from '../internal/portal-move.js';

export interface PopupConnection {
  getActive(): boolean;
  suspend(): void;
  resume(): void;
  getSnapshot(): { readonly revision: number };
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  completeLayerExit(generation: number): Result<void>;
  syncLayerHost(host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode>;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  syncDismissal(options: PopupDismissalOptions): Result<void>;
  syncBehavior(options: PopupBehaviorOptions): Result<void, PopupBehaviorErrorCode>;
  syncDisabled(disabled: boolean): Result<void>;
  syncGesture?(options: DrawerGestureOptions): Result<void, DrawerGestureErrorCode>;
  syncPosition?(options: PopupPositionOptions): void;
  syncControlledValue(open: boolean): { readonly ok: boolean };
  handleEvent(event: 'open' | 'close' | 'toggle', inputMethod?: PopupInputMethod, reason?: PopupCloseReason): boolean;
  refresh(): void;
  prepareMove(): void;
  completeMove(restoreFocus?: boolean): void;
  disconnect(): void;
}

export interface PopupFactoryOptions extends PositionOptions {
  readonly openDelay?: number;
  readonly closeDelay?: number;
  readonly group?: TooltipGroup;
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly overlay?: HTMLElement;
  readonly handle?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly restoreFocusTarget?: HTMLElement;
  readonly trapFocus?: boolean;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
  readonly onOpenChange: PopupOpenChangeHandler;
  readonly onUpdate: () => void;
  readonly manageVisibility?: boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection;
  readonly reservation?: LayerReservation;
  readonly position?: boolean;
}

export interface PopupComponentConfig {
  readonly scope: string;
  readonly role: 'dialog' | 'alertdialog' | 'tooltip';
  readonly modal: boolean;
  readonly triggerMode: 'click' | 'focus-hover';
  readonly describeTrigger?: (describedBy: string | undefined, contentID: string, present: boolean) => string | undefined;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly positioned?: boolean;
  readonly directional?: boolean;
  readonly defaultSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Retained closed content may project as an inline region (Drawer only). */
  readonly inlinePresentation?: boolean;
  create(options: PopupFactoryOptions): PopupConnection;
}

export interface PopupRootSlotProps {
  readonly open: boolean;
  readonly disabled: boolean;
  readonly inputMethod: PopupInputMethod;
  /** Canonical paint generation; absent before DOM admission, including SSR. */
  readonly presentation: DOMLayerPresentationSnapshot | undefined;
}
export interface PopupRootExpose { requestClose(): void }
export interface PopupRootProps extends PositionOptions {
  /** Positioned roots prefer this element over a rendered Anchor or Trigger. */
  readonly anchor?: HTMLElement | null;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  /** Omit for the compound Description ID; null removes optional description association. */
  readonly describedBy?: string | null;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  /** Explicit initiating element; null uses the ordinary Trigger fallback. */
  readonly restoreFocusTarget?: HTMLElement | null;
  readonly trapFocus?: boolean;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly unmountOnExit?: boolean;
  readonly position?: boolean;
}
export interface PopupPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PopupPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }

type PopupElementPart = 'trigger' | 'anchor' | 'arrow' | 'overlay' | 'handle' | 'content';

interface PopupContext {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly open: ComputedRef<boolean>;
  readonly inline: ComputedRef<boolean>;
  readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  readonly inputMethod: Readonly<ShallowRef<PopupInputMethod>>;
  readonly disabled: ComputedRef<boolean>;
  readonly modal: ComputedRef<boolean>;
  readonly unmountOnExit: ComputedRef<boolean>;
  readonly label: ComputedRef<string | undefined>;
  readonly describedBy: ComputedRef<string | undefined>;
  readonly contentID: string;
  readonly titleID: string;
  readonly descriptionID: string;
  readonly side: ComputedRef<'top' | 'right' | 'bottom' | 'left'>;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  registerPresence(part: 'content' | 'overlay', present: ShallowRef<boolean>): () => void;
  registerElement(part: PopupElementPart, element?: HTMLElement): void;
  activateTrigger(event?: Event): void;
  deactivateTrigger(event?: Event): void;
  close(event?: MouseEvent): void;
  refresh(): void;
}

export function createPopupComponents(config: PopupComponentConfig): Readonly<{
  Root: Component;
  Trigger: Component;
  Anchor: Component;
  Portal: Component;
  Overlay: Component;
  Handle: Component;
  Content: Component;
  Title: Component;
  Description: Component;
  Close: Component;
  Arrow: Component;
}> {
  const contextKey = Symbol(`Sectile${config.scope}Root`);
  const useRoot = (part: string): PopupContext => {
    const context = inject<PopupContext>(contextKey);
    if (context === undefined) throw new TypeError(`${part} must be used inside ${config.scope} Root.`);
    return context;
  };
  const primitiveProps = {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  };
  const buttonProps = {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  };

  const Root = defineComponent({
    name: `Sectile${pascal(config.scope)}Root`,
    inheritAttrs: false,
    props: {
      openDelay: { type: Number, default: 0 },
      closeDelay: { type: Number, default: 0 },
      group: { type: Object as PropType<TooltipGroup>, default: undefined },
      open: { type: Boolean, default: undefined },
      defaultOpen: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      modal: { type: Boolean, default: config.modal },
      label: { type: String, default: undefined },
      describedBy: { type: String, default: undefined },
      initialFocus: { type: Object as PropType<HTMLElement>, default: undefined },
      restoreFocusTarget: { type: Object as PropType<HTMLElement | null>, default: undefined },
      anchor: { type: Object as PropType<HTMLElement | null>, default: undefined },
      autoFocus: { type: Boolean, default: true },
      restoreFocus: { type: Boolean, default: true },
      trapFocus: { type: Boolean, default: config.modal },
      closeOnEscape: { type: Boolean, default: config.closeOnEscape ?? true },
      closeOnInteractOutside: { type: Boolean, default: config.closeOnInteractOutside ?? false },
      interactOutsideExclusions: { type: Array as PropType<readonly HTMLElement[]>, default: undefined },
      ...positionProps,
      side: { ...positionProps.side, default: config.defaultSide ?? 'bottom' },
      swipeToDismiss: { type: Boolean, default: true },
      swipeThreshold: { type: Number, default: 80 },
      swipeVelocityThreshold: { type: Number, default: 0.5 },
      arrowPadding: { type: Number, default: 8 },
      unmountOnExit: { type: Boolean, default: false },
      presentation: { type: String as PropType<'overlay' | 'inline'>, default: 'overlay' },
    },
    emits: {
      'update:open': (_open: boolean): boolean => true,
      closeRequest: (_reason: PopupCloseReason): boolean => true,
      afterClose: (): boolean => true,
      interactOutside: (_event: InteractOutsideEvent): boolean => true,
    },
    slots: Object as SlotsType<{ default: (props: PopupRootSlotProps) => VNodeChild }>,
    setup(props, { emit, slots, expose }) {
      const controlled = useControlledStateInvariant(`${config.scope}Root`, 'open', () => props.open);
      const localOpen = ref(controlled ? props.open as boolean : props.defaultOpen);
      const requestedPlacement = (): 'overlay' | 'inline' => config.inlinePresentation ? props.presentation ?? 'overlay' : 'overlay';
      const validatePlacement = (): void => {
        const requested = requestedPlacement();
        if ((requested !== 'overlay' && requested !== 'inline') || (requested === 'inline'
          && (props.open === true || props.defaultOpen === true || props.unmountOnExit))) {
          throw new TypeError('Inline Drawer presentation requires closed, retained content.');
        }
      };
      validatePlacement();
      const placement = shallowRef(requestedPlacement());
      const inline = computed(() => placement.value === 'inline');
      const trigger = shallowRef<HTMLElement>();
      const anchor = shallowRef<HTMLElement>();
      const arrow = shallowRef<HTMLElement>();
      const overlay = shallowRef<HTMLElement>();
      const handle = shallowRef<HTMLElement>();
      const content = shallowRef<HTMLElement>();
      const connection = shallowRef<PopupConnection>();
      providePortalMove(() => connection.value);
      const hostAvailability = useHostActive();
      const parentLayer = useHostLayerParent();
      const parentAllowsPresentation = (): boolean => parentLayer?.available.value ?? true;
      const availability = computed(() => hostAvailability.value && (!localOpen.value || parentAllowsPresentation()));
      const active = shallowRef(availability.value);
      provideHostActive(active);
      expose({ requestClose: () => { connection.value?.handleEvent('close', 'programmatic'); } } satisfies PopupRootExpose);
      const invocation = config.scope === 'dialog' || config.scope === 'drawer' || config.scope === 'alert-dialog' ? useHostPopup() : undefined;
      let reservation = invocation?.reservation;
      if (reservation !== undefined && (!localOpen.value || inline.value)) throw new TypeError('A reserved popup binding requires an initially open overlay.');
      invocation?.attach(() => { connection.value?.handleEvent('close', 'programmatic'); });
      const presentation = shallowRef<DOMLayerPresentationSnapshot>();
      const inputMethod = shallowRef<PopupInputMethod>('programmatic');
      const layerHost = useHostLayer();
      const contentPresence = shallowRef<ShallowRef<boolean>>();
      const overlayPresence = shallowRef<ShallowRef<boolean>>();
      let stopPresentation: (() => void) | undefined;
      const id = useHostId();
      const contentID = `sectile-${config.scope}-${id}-content`;
      const titleID = `sectile-${config.scope}-${id}-title`;
      const descriptionID = `sectile-${config.scope}-${id}-description`;
      const describedBy = computed(() => props.describedBy === undefined ? descriptionID : props.describedBy ?? undefined);
      const open = computed(() => localOpen.value);
      const disabled = computed(() => props.disabled);
      const modal = computed(() => props.modal);
      const unmountOnExit = computed(() => props.unmountOnExit);
      const label = computed(() => props.label);
      const side = computed(() => props.side);
      const position = computed(() => props.position);
      const strategy = computed(() => props.strategy);
      const update = (): void => {
        const current = connection.value;
        if (current && !current.getActive()) {
          active.value = false;
          invocation?.onActiveChange?.(false);
          return;
        }
        if (current === undefined || current.getLayerOrder() === null || presentation.value?.phase === 'active') return;
        stopPresentation?.();
        const subscribed = current.subscribeLayerPresentation((snapshot) => { presentation.value = snapshot; });
        if (!subscribed.ok) throw new SectileResultError(subscribed.error);
        stopPresentation = subscribed.value;
      };
      const disconnect = (): void => {
        stopPresentation?.();
        stopPresentation = undefined;
        try { connection.value?.disconnect(); }
        finally { connection.value = undefined; presentation.value = undefined; }
      };
      const registerPresence = (part: 'content' | 'overlay', present: ShallowRef<boolean>): (() => void) => {
        const target = part === 'content' ? contentPresence : overlayPresence;
        target.value = present;
        return () => { if (target.value === present) target.value = undefined; };
      };
      let inactiveClosePending = false;
      const afterClose = (): void => {
        inactiveClosePending = false;
        try { invocation?.onAfterClose(); }
        finally { emit('afterClose'); }
      };
      watch([active, presentation, () => contentPresence.value?.value, () => overlayPresence.value?.value], ([available, snapshot, panel, backdrop]) => {
        if (!available || localOpen.value || panel === true || backdrop === true) return;
        if (inactiveClosePending && snapshot?.phase !== 'exiting') { afterClose(); return; }
        if (snapshot?.phase !== 'exiting') return;
        const result = connection.value?.completeLayerExit(snapshot.generation);
        if (result !== undefined && !result.ok) throw new SectileResultError(result.error);
        if (result?.ok && presentation.value?.phase === 'closed' && presentation.value.generation === snapshot.generation) {
          afterClose();
        }
      }, { flush: 'post' });
      let restoreAutoFocusOnClose = false;
      let reconnectPending = false;
      let inactiveRefsChanged = false;
      const restoreFocusTarget = (): HTMLElement | undefined => props.restoreFocusTarget === undefined
        ? invocation?.restoreFocusTarget : props.restoreFocusTarget ?? undefined;
      let inlineReturn: { readonly panel: HTMLElement; readonly target: HTMLElement; armed: boolean } | undefined;
      const rememberInlineOrigin = (): void => {
        const panel = content.value, focused = panel?.ownerDocument.activeElement;
        inlineReturn = active.value && props.restoreFocus && panel && focused instanceof HTMLElement && panel.contains(focused)
          ? { panel, target: focused, armed: false } : undefined;
      };
      watch(inline, async (next) => {
        if (!next) return;
        const pending = inlineReturn; inlineReturn = undefined;
        if (!pending?.armed) return;
        await nextTick();
        if (destroyed || !inline.value || localOpen.value || !active.value || !props.restoreFocus || content.value !== pending.panel) return;
        const panel = pending.panel, document = panel.ownerDocument;
        const focused = (panel.getRootNode() as Document | ShadowRoot).activeElement;
        if (focused && focused !== document.body && focused !== document.documentElement && !panel.contains(focused)) return;
        for (const target of [restoreFocusTarget(), trigger.value, pending.target]) {
          if (!target || !panel.contains(target) || !target.isConnected || target.closest('[hidden],[inert],[aria-hidden="true"],:disabled')) continue;
          let visible = true;
          for (let node: HTMLElement | null = target; node; node = node.parentElement) {
            const style = document.defaultView?.getComputedStyle(node);
            if (style?.display === 'none' || style?.visibility === 'hidden' || style?.visibility === 'collapse' || style?.contentVisibility === 'hidden') { visible = false; break; }
          }
          if (!visible) continue;
          target.focus({ preventScroll: true });
          break;
        }
      }, { flush: 'post' });
      const connect = (preserveOpenLifecycle = false): void => {
        if (!availability.value) return;
        if (inline.value) { disconnect(); return; }
        // Exit paint belongs to the current adapter until both Presence owners release it.
        if (presentation.value?.phase === 'exiting' && !localOpen.value) { reconnectPending = true; return; }
        reconnectPending = false;
        if (content.value === undefined) return;
        const host = layerHost.value;
        if (host === null) unwrap(failResult('construction', 'dom.layer-host-unavailable', 'Managed popup layer host is unavailable'));
        const preserveFocusLifecycle = preserveOpenLifecycle && connection.value !== undefined && localOpen.value;
        const completed = presentation.value?.phase === 'closed' ? presentation.value : undefined;
        disconnect();
        const positionAnchor = config.positioned === true ? props.anchor ?? anchor.value : anchor.value;
        const focusTarget = restoreFocusTarget();
        connection.value = config.create({
          root: content.value,
          ...(trigger.value === undefined ? {} : { trigger: trigger.value }),
          ...(positionAnchor === undefined ? {} : { anchor: positionAnchor }),
          ...(arrow.value === undefined ? {} : { arrow: arrow.value }),
          ...(overlay.value === undefined ? {} : { overlay: overlay.value }),
          ...(handle.value === undefined ? {} : { handle: handle.value }),
          ...(controlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
          disabled: props.disabled,
          modal: props.modal,
          ...(props.label === undefined ? { labelledBy: titleID } : { label: props.label }),
          ...(describedBy.value === undefined ? {} : { describedBy: describedBy.value }),
          ...(props.initialFocus === undefined ? {} : { initialFocus: props.initialFocus }),
          autoFocus: preserveFocusLifecycle ? false : props.autoFocus,
          restoreFocus: props.restoreFocus,
          ...(focusTarget === undefined ? {} : { restoreFocusTarget: focusTarget }),
          trapFocus: props.trapFocus,
          closeOnEscape: props.closeOnEscape,
          closeOnInteractOutside: props.closeOnInteractOutside,
          ...(props.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: props.interactOutsideExclusions }),
          side: props.side,
          ...(config.positioned === true ? readPositionOptions(props) : {}),
          swipeToDismiss: props.swipeToDismiss,
          swipeThreshold: props.swipeThreshold,
          swipeVelocityThreshold: props.swipeVelocityThreshold,
          arrowPadding: props.arrowPadding,
          manageVisibility: false,
          ...(config.triggerMode === 'focus-hover' ? { openDelay: props.openDelay, closeDelay: props.closeDelay,
            ...(props.group === undefined ? {} : { group: props.group }) } : {}),
          retainExit: true,
          ...(host == null ? {} : { layerHost: host }),
          ...(reservation === undefined ? {} : { reservation }),
          onOpenChange: (next, method, reason) => {
            inputMethod.value = method;
            if (!controlled) localOpen.value = next;
            try {
              if (!next && reason !== undefined) {
                try { invocation?.onCloseRequest(reason); }
                finally { emit('closeRequest', reason); }
              }
            } finally {
              try { if (!controlled) invocation?.onOpenChange(next); }
              finally { emit('update:open', next); }
            }
          },
          onInteractOutside: (event) => { emit('interactOutside', event); },
          onUpdate: update,
        });
        reservation = undefined;
        restoreAutoFocusOnClose = preserveFocusLifecycle && props.autoFocus;
        update();
        if (completed && !localOpen.value && presentation.value === undefined) presentation.value = completed;
        invocation?.onActiveChange?.(active.value && connection.value.getActive());
        invocation?.onOpenChange(localOpen.value);
      };
      const connectScheduled = shallowRef(false);
      let destroyed = false;
      watch(connectScheduled, async (scheduled) => {
        if (!scheduled) return;
        await nextTick();
        connectScheduled.value = false;
        if (!destroyed && availability.value) connect();
      }, { flush: 'post' });
      const scheduleConnect = (): void => {
        if (!availability.value || inline.value || connectScheduled.value || destroyed || (props.unmountOnExit && !localOpen.value)) return;
        connectScheduled.value = true;
      };
      const elements = { trigger, anchor, arrow, overlay, handle, content };
      const syncPosition = (): boolean => {
        const current = connection.value;
        if (config.positioned !== true || !current?.syncPosition) return false;
        current.syncPosition({
          anchor: props.anchor ?? anchor.value ?? null,
          ...readPositionOptions(props), arrowPadding: props.arrowPadding,
        });
        return true;
      };
      const registerElement = (part: PopupElementPart, element?: HTMLElement): void => {
        const target = elements[part];
        if (target.value === element) return;
        target.value = element;
        if (part === 'anchor' && props.anchor != null) return;
        if (!availability.value) { inactiveRefsChanged = true; return; }
        if (part === 'anchor' && syncPosition()) return;
        if (presentation.value?.phase === 'exiting' && !localOpen.value) { reconnectPending = true; return; }
        if (content.value === undefined) disconnect();
        else scheduleConnect();
      };
      const suspend = (): void => {
        if (destroyed) return;
        inlineReturn = undefined;
        const current = connection.value;
        const exiting = presentation.value?.phase === 'exiting';
        try { current?.suspend(); }
        finally {
          // A publication error may follow successful native retirement.
          // Unsupported branches leave their actual availability unchanged.
          if (!current || !current.getActive()) {
            inactiveClosePending ||= exiting;
            active.value = false;
            invocation?.onActiveChange?.(false);
          }
        }
      };
      watch(hostAvailability, (next) => { if (!next) suspend(); }, { flush: 'sync' });
      watch(availability, (next) => {
        if (destroyed) return;
        // Ancestor eligibility changes after native publication has drained.
        if (!next) { suspend(); return; }
        if (inactiveRefsChanged) { inactiveRefsChanged = false; connect(true); }
        else if (connection.value) { connection.value.resume(); update(); }
        else scheduleConnect();
        active.value = true;
        invocation?.onActiveChange?.(connection.value?.getActive() === true);
      }, { flush: 'post' });
      watch(presentation, (snapshot) => {
        if (!reconnectPending) return;
        if (snapshot?.phase === 'active' && localOpen.value) { connect(true); return; }
        if (snapshot?.phase !== 'closed') return;
        if (content.value === undefined) {
          reconnectPending = false; disconnect();
          // Keep the completed slot result observable after releasing its native owner.
          presentation.value = snapshot;
        }
        else scheduleConnect();
      }, { flush: 'post' });
      watch(layerHost, (host) => {
        // Unavailable boundaries keep the last accepted generation; they never fall back to a parent.
        if (host === null) return;
        if (connection.value === undefined) { scheduleConnect(); return; }
        unwrap(connection.value.syncLayerHost(host));
      }, { flush: 'post' });
      if (parentLayer) watch([
        connection, () => presentation.value?.generation, () => presentation.value?.phase,
        parentLayer.element, () => parentLayer.presentation.value?.generation, () => parentLayer.presentation.value?.phase,
      ], () => {
        const parent = parentLayer.element.value;
        if (parent && presentation.value?.phase === 'active' && parentLayer.presentation.value?.phase === 'active') {
          unwrap(connection.value!.syncLayerParent(parent));
        }
      }, { flush: 'post' });
      const activateTrigger = (event?: Event): void => {
        if (inline.value || event?.defaultPrevented === true || connection.value !== undefined || props.disabled || localOpen.value) return;
        inputMethod.value = popupInputMethod(event);
        if (!controlled) localOpen.value = true;
        emit('update:open', true);
      };
      const deactivateTrigger = (event?: Event): void => {
        if (event?.defaultPrevented === true || connection.value !== undefined || !localOpen.value) return;
        inputMethod.value = popupInputMethod(event);
        if (!controlled) localOpen.value = false;
        emit('update:open', false);
      };
      watch([
        () => props.open, () => props.modal, () => props.label, () => props.initialFocus, () => props.autoFocus, () => props.describedBy,
        () => props.restoreFocus, () => props.trapFocus, () => props.interactOutsideExclusions, () => props.disabled, () => props.restoreFocusTarget,
      ], (_values, previousValues) => {
        validatePlacement();
        // A simultaneous return to overlay precedes acceptance of its opening.
        if (inline.value && requestedPlacement() === 'overlay') {
          rememberInlineOrigin();
          placement.value = 'overlay';
          scheduleConnect();
        }
        const current = connection.value;
        if (current) unwrap(current.syncDisabled(props.disabled));
        // Apply the current render's behavior before accepting its open/close transition.
        if (current && config.role !== 'tooltip') unwrap(current.syncBehavior({
          modal: props.modal, autoFocus: props.autoFocus, restoreFocus: props.restoreFocus, trapFocus: props.trapFocus,
          label: props.label, labelledBy: props.label === undefined ? titleID : undefined, describedBy: describedBy.value,
          initialFocus: props.initialFocus, interactOutsideExclusions: props.interactOutsideExclusions,
          restoreFocusTarget: restoreFocusTarget() ?? null,
        }));
        const next = props.open;
        if (!controlled || next === undefined || Object.is(next, previousValues[0])) return;
        if (next && !parentAllowsPresentation()) suspend();
        if (current === undefined) {
          localOpen.value = next;
          invocation?.onOpenChange(next);
          return;
        }
        const result = current.syncControlledValue(next);
        if (!result.ok) throw new TypeError(`${config.scope} controlled open state could not be synchronized.`);
        localOpen.value = next;
        invocation?.onOpenChange(next);
      });
      watch([
        () => props.swipeToDismiss, () => props.swipeThreshold, () => props.swipeVelocityThreshold,
        () => config.directional === true ? props.side : undefined,
      ], () => {
        const current = connection.value;
        if (current?.syncGesture) unwrap(current.syncGesture({ side: props.side, swipeToDismiss: props.swipeToDismiss,
          swipeThreshold: props.swipeThreshold, swipeVelocityThreshold: props.swipeVelocityThreshold }));
      });
      watch([
        () => props.anchor,
        ...positionSources(props), () => props.arrowPadding,
      ], syncPosition, { flush: 'post' });
      watch([() => props.closeOnEscape, () => props.closeOnInteractOutside], () => {
        const current = connection.value;
        if (current) unwrap(current.syncDismissal({ closeOnEscape: props.closeOnEscape, closeOnInteractOutside: props.closeOnInteractOutside }));
      });
      watch([() => props.openDelay, () => props.closeDelay, () => props.group], () => { if (config.triggerMode === 'focus-hover') scheduleConnect(); });
      watch(localOpen, (next, previous) => {
        if (inlineReturn) {
          if (next) inlineReturn.armed = false;
          else if (previous && requestedPlacement() === 'inline') inlineReturn.armed = true;
          else inlineReturn = undefined;
        }
        if (next) inactiveClosePending = false;
        if (!next && !active.value) inactiveClosePending = true;
        if (!next && restoreAutoFocusOnClose) scheduleConnect();
      });
      if (config.inlinePresentation) watch([
        requestedPlacement, () => props.unmountOnExit, () => props.open, () => props.defaultOpen,
        localOpen, () => presentation.value?.phase,
      ], () => {
        validatePlacement();
        const requested = requestedPlacement();
        if (requested === placement.value) return;
        // Controlled refusal and retained exit paint belong to the incumbent owner.
        if (requested === 'inline' && (localOpen.value || presentation.value?.phase === 'active' || presentation.value?.phase === 'exiting')) return;
        if (requested === 'inline') disconnect();
        else if (inline.value) rememberInlineOrigin();
        placement.value = requested;
        if (requested === 'overlay') {
          // A rejected inline opening may leave the controlled prop unchanged.
          // The new overlay owner admits that current value, not a stale local copy.
          if (controlled && props.open !== undefined) localOpen.value = props.open;
          scheduleConnect();
        }
      });
      onBeforeUnmount(() => {
        destroyed = true;
        inlineReturn = undefined;
        try { disconnect(); }
        finally { invocation?.detach(); }
      });
      provide<PopupContext>(contextKey, {
        active, open, inline, presentation, inputMethod, disabled, modal, unmountOnExit, label, describedBy, contentID, titleID, descriptionID, side, position, strategy,
        registerPresence, registerElement, activateTrigger, deactivateTrigger,
        close: (event) => { connection.value?.handleEvent('close', popupInputMethod(event), 'close-button'); },
        refresh: () => { connection.value?.refresh(); },
      });
      return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ open: open.value, disabled: props.disabled, inputMethod: inputMethod.value, presentation: presentation.value, ...(config.inlinePresentation ? { placement: placement.value } : {}) }) ?? []);
    },
  });

  const Trigger = defineComponent({
    name: `Sectile${pascal(config.scope)}Trigger`, inheritAttrs: false, props: buttonProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Trigger');
      return (): VNodeChild => {
        const elementRef = (element: unknown): void => { root.registerElement('trigger', element instanceof HTMLElement ? element : undefined); };
        const attributes = mergeProps(attrs, {
          ...(config.triggerMode === 'click'
            ? { onClick: root.activateTrigger }
            : { onFocus: root.activateTrigger, onBlur: root.deactivateTrigger, onMouseenter: root.activateTrigger, onMouseleave: root.deactivateTrigger }),
          ...(config.role === 'tooltip' && props.asChild ? {} : { type: props.as === 'button' ? 'button' : undefined }),
          ...(config.role === 'tooltip' && props.asChild && !root.disabled.value ? {} : { disabled: root.disabled.value }),
          ...(config.role === 'tooltip' ? {} : {
            'aria-haspopup': root.inline.value ? undefined : 'dialog',
            'aria-expanded': config.triggerMode === 'click' ? String(root.open.value) : undefined,
            'aria-controls': root.contentID,
          }),
          'data-scope': config.scope, 'data-part': 'trigger', 'data-state': root.open.value ? 'open' : 'closed',
        });
        if (!config.describeTrigger) return h(Primitive, { ...attributes, as: props.as, asChild: props.asChild, elementRef }, slots);
        // Project after adoption merges the caller's child attributes; slots are invoked once.
        return h(Primitive, { asChild: true, elementRef }, { default: () => renderPrimitive(props, attributes, slots, adopted => ({
          ...adopted, 'aria-describedby': config.describeTrigger!(typeof adopted['aria-describedby'] === 'string' ? adopted['aria-describedby'] : undefined,
            root.contentID, root.open.value || !root.unmountOnExit.value),
        })) });
      };
    },
  });

  const Content = defineComponent({
    name: `Sectile${pascal(config.scope)}Content`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Content');
      const direction = useHostDirection();
      const element = shallowRef<HTMLElement>();
      const retainedReopen = shallowRef(0);
      provideHostLayerParent({ element, presentation: root.presentation, open: root.open, inline: root.inline, active: root.active });
      const visible = computed(() => root.open.value || root.inline.value);
      const present = usePresence(visible, element, () => { retainedReopen.value += 1; }, root.active);
      onBeforeUnmount(root.registerPresence('content', present));
      const refreshAfterRender = async (): Promise<void> => { await nextTick(); root.refresh(); };
      watch(present, refreshAfterRender, { flush: 'post' });
      watch(retainedReopen, refreshAfterRender, { flush: 'post' });
      return (): VNodeChild => {
        if (root.unmountOnExit.value && !present.value) return null;
        return h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild,
          elementRef: (candidate: unknown) => {
            const node = candidate instanceof HTMLElement ? candidate : undefined;
            element.value = node;
            root.registerElement('content', node);
          },
          id: root.contentID, role: root.inline.value ? undefined : config.role, hidden: !root.active.value || !present.value, dir: direction.value,
          style: config.positioned === true && root.position.value
            ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined }
            : undefined,
          'aria-modal': root.inline.value || config.role === 'tooltip' ? undefined : String(root.modal.value),
          ...(config.role === 'tooltip' ? {} : {
            'aria-label': root.inline.value ? undefined : root.label.value, 'aria-labelledby': root.inline.value || root.label.value !== undefined ? undefined : root.titleID,
            'aria-describedby': root.inline.value ? undefined : root.describedBy.value,
          }),
          'data-presentation': config.inlinePresentation ? root.inline.value ? 'inline' : 'overlay' : undefined,
          'data-scope': config.scope, 'data-part': 'content', 'data-state': root.open.value ? 'open' : 'closed',
          'data-input-method': root.inputMethod.value,
          'data-side': config.directional === true ? root.side.value : undefined,
          'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
        }), slots);
      };
    },
  });

  const Anchor = defineComponent({
    name: `Sectile${pascal(config.scope)}Anchor`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Anchor');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.registerElement('anchor', element instanceof HTMLElement ? element : undefined); },
        'data-scope': config.scope, 'data-part': 'anchor',
      }), slots);
    },
  });

  const Arrow = defineComponent({
    name: `Sectile${pascal(config.scope)}Arrow`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Arrow');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.registerElement('arrow', element instanceof HTMLElement ? element : undefined); },
        'aria-hidden': 'true', 'data-scope': config.scope, 'data-part': 'arrow',
      }), slots);
    },
  });

  const Overlay = defineComponent({
    name: `Sectile${pascal(config.scope)}Overlay`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Overlay');
      const element = shallowRef<HTMLElement>();
      const present = usePresence(root.open, element, undefined, root.active);
      onBeforeUnmount(root.registerPresence('overlay', present));
      return (): VNodeChild => {
        if (root.unmountOnExit.value && !present.value) return null;
        const exiting = !root.open.value && present.value;
        return h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild, elementRef: (candidate: unknown) => { const node = candidate instanceof HTMLElement ? candidate : undefined; element.value = node; root.registerElement('overlay', node); }, hidden: !root.active.value || !present.value, 'aria-hidden': 'true',
          ...(exiting || !root.active.value ? { inert: true } : {}),
          'data-scope': config.scope, 'data-part': 'overlay', 'data-state': root.open.value ? 'open' : 'closed',
          'data-input-method': root.inputMethod.value,
          'data-side': config.directional === true ? root.side.value : undefined,
          'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
        }), slots);
      };
    },
  });

  const Handle = defineComponent({
    name: `Sectile${pascal(config.scope)}Handle`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Handle');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (candidate: unknown) => { root.registerElement('handle', candidate instanceof HTMLElement ? candidate : undefined); },
        'aria-hidden': 'true', 'data-scope': config.scope, 'data-part': 'handle',
        'data-state': root.open.value ? 'open' : 'closed',
        'data-side': config.directional === true ? root.side.value : undefined,
        'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
      }), slots);
    },
  });

  const Title = createLabelPart('Title', 'title', (root) => root.titleID);
  const Description = createLabelPart('Description', 'description', (root) => root.descriptionID);
  const Close = defineComponent({
    name: `Sectile${pascal(config.scope)}Close`, inheritAttrs: false, props: buttonProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Close');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        'data-scope': config.scope, 'data-part': 'close', onClick: root.close,
      }), slots);
    },
  });
  const Portal = HostPortal;

  function createLabelPart(name: string, part: string, id: (root: PopupContext) => string): Component {
    return defineComponent({
      name: `Sectile${pascal(config.scope)}${name}`, inheritAttrs: false, props: primitiveProps,
      setup(props, { attrs, slots }) {
        const root = useRoot(name);
        return (): VNodeChild => h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild, id: id(root), 'data-scope': config.scope, 'data-part': part,
        }), slots);
      },
    });
  }

  return Object.freeze({ Root, Trigger, Anchor, Portal, Overlay, Content, Handle, Title, Description, Close, Arrow });
}

export type { InteractOutsideEvent, InteractOutsideHandler };

function pascal(value: string): string {
  return value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('');
}

function popupInputMethod(event?: Event): PopupInputMethod {
  if (event === undefined) return 'programmatic';
  return event.type === 'mouseenter' || event.type === 'mouseleave'
    || event.type === 'click' && (event as MouseEvent).detail !== 0 ? 'pointer' : 'keyboard';
}

function swipeDirection(side: 'top' | 'right' | 'bottom' | 'left'): 'up' | 'right' | 'down' | 'left' {
  return side === 'top' ? 'up' : side === 'bottom' ? 'down' : side;
}
