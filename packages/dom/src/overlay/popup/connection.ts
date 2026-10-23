import type { Result } from '@sectile/core';
import { SectileResultError, okResult, failResult } from '@sectile/core/result';
import type { LayerPolicy } from '@sectile/core/layer-stack';
export type PopupBehaviorErrorCode = import('@sectile/core').CoreErrorCode | 'dom.popup-options-invalid';
import type { InteractionIntent, InteractionStateInput } from '@sectile/core/interaction';
/** Origin of one popup request, not a second interaction state machine. */
export type PopupInputMethod = 'keyboard' | 'pointer' | 'programmatic';
export type PopupCloseReason = 'escape' | 'interact-outside' | 'close-button' | 'programmatic' | 'ancestor-closed' | 'swipe';
/** Close cause describes a request; controlled acceptance remains the caller's decision. */
export type PopupOpenChangeHandler = (open: boolean, inputMethod: PopupInputMethod, reason?: PopupCloseReason) => void;
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import {
  createControlledComponentController,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from '../../interaction/attributes.js';
import {
  createDOMLayerID,
  getDOMLayerManager,
  type DOMLayerManager,
  type LayerHostConnection,
  type LayerReservation,
  type LayerHostTransferErrorCode,
  type DOMLayerReparentErrorCode,
  type DOMLayerPresentationListener,
  type DOMLayerPresentationSubscription,
} from '../layer/manager.js';
export type { DOMLayerReparentErrorCode, DOMLayerPresentationErrorCode, DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription, LayerHostConnection, LayerHostTransferErrorCode } from '../layer/manager.js';
import { acquireModalEffects, type ModalEffects } from '../modal/effects.js';
import { createHiddenBinding, type HiddenBinding } from '../../interaction/visibility.js';
import { captureSurfaceMoveFocus, restoreSurfaceMoveFocus, type SurfaceMoveFocus } from '../surface-move.js';
import {
  createInteractOutsideEvent,
  isEventInside,
  type InteractOutsideHandler,
} from '../../interact-outside.js';

export interface DOMPopupConnection<State, Event> {
  getSnapshot(): RevisionSnapshot<State>;
  /** Native availability, independent of the accepted open value. */
  getActive(): boolean;
  /** Current zero-based semantic document-stack index; null when inactive. O(1) expected. */
  getLayerOrder(): number | null;
  /** One initial and then affected committed snapshot per admitted generation; closed releases it. */
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  /** Release only the matching exiting generation; stale or active completion is a no-op. */
  completeLayerExit(generation: number): Result<void>;
  /** Reparent this active generation to a unique registered parent surface; null detaches. */
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  /** Atomically change paint-host participation and future openings; does not move DOM nodes. */
  syncLayerHost(host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode>;
  /** Update active and future dismissal without replacing the current generation. */
  syncDismissal(options: PopupDismissalOptions): Result<void>;
  /** Replace native behavior options without reopening or applying initial focus now. */
  syncBehavior(options: PopupBehaviorOptions): Result<void, PopupBehaviorErrorCode>;
  /** Update user interaction without replacing state or the current presentation. */
  syncDisabled(disabled: boolean): Result<void>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event, inputMethod?: PopupInputMethod, reason?: PopupCloseReason): boolean;
  refresh(): void;
  /** Capture existing surface focus immediately before moving its retained DOM. */
  prepareMove(): void;
  /** Reconcile the completed move without replaying initial focus. False cancels. */
  completeMove(restoreFocus?: boolean): void;
  disconnect(): void;
  /** Release native presentation resources while preserving the accepted controller. */
  suspend(): void;
  /** Re-admit current state as a fresh generation without replaying initial focus. */
  resume(): void;
}

export interface PopupDismissalOptions {
  readonly closeOnEscape: boolean;
  readonly closeOnInteractOutside: boolean;
}

export interface PopupBehaviorOptions {
  readonly modal: boolean;
  readonly autoFocus: boolean;
  readonly restoreFocus: boolean;
  /** Omit to retain the initiating target; null restores ordinary Trigger fallback. */
  readonly restoreFocusTarget?: HTMLElement | null | undefined;
  readonly trapFocus: boolean;
  readonly label?: string | undefined;
  readonly labelledBy?: string | undefined;
  readonly describedBy?: string | undefined;
  readonly initialFocus?: HTMLElement | undefined;
  readonly interactOutsideExclusions?: readonly HTMLElement[] | undefined;
}

export interface PopupFocusHoverHooks { readOpen(): boolean; request(open: boolean, inputMethod: PopupInputMethod): void }
export interface PopupFocusHoverBinding { cancelPending(): void; disconnect(): void }
export interface DOMPopupOptions<State, Event, Command extends object> {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement | undefined;
  readonly role: 'dialog' | 'alertdialog' | 'tooltip';
  readonly modal?: boolean;
  readonly label?: string | undefined;
  readonly labelledBy?: string | undefined;
  readonly describedBy?: string | undefined;
  readonly controlled: boolean;
  readonly initial: Result<State>;
  readonly open: Event;
  readonly toggle: Event;
  readonly close: Event;
  readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>;
  readonly create: (open: boolean, state: State) => Result<State>;
  readonly read: (state: State) => boolean;
  readonly triggerMode?: 'click' | 'focus-hover';
  readonly bindFocusHover?: (hooks: PopupFocusHoverHooks) => PopupFocusHoverBinding;
  readonly initialFocus?: HTMLElement | undefined;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  /** Borrowed initiating target, independent of a trigger's event/ARIA ownership. */
  readonly restoreFocusTarget?: HTMLElement | undefined;
  readonly trapFocus?: boolean;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[] | undefined;
  readonly modalBranches?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler | undefined;
  readonly onOpenChange?: PopupOpenChangeHandler | undefined;
  readonly command?: (command: Command) => void;
  readonly onUpdate?: (() => void) | undefined;
  readonly interaction: InteractionStateInput;
  readonly interactionIntent?: ((event: Event) => InteractionIntent) | undefined;
  readonly manageVisibility?: boolean | undefined;
  readonly retainExit?: boolean | undefined;
  readonly layerHost?: LayerHostConnection | undefined;
  readonly reservation?: LayerReservation | undefined;
  readonly onPresentationSuspend?: () => void;
  readonly onPresentationResume?: () => void;
}

export function readPopupOpen(state: { readonly open: boolean }): boolean {
  return state.open;
}

/** Wrapper cleanup checks the popup owner before releasing its own resources. */
export function assertPopupWritable(root: HTMLElement): void {
  getDOMLayerManager(root).assertWritable();
}

function isFocusReturnTarget(target: PopupBehaviorOptions['restoreFocusTarget']): boolean {
  return target == null || (target.nodeType === 1 && typeof target.focus === 'function' && target.ownerDocument != null);
}

export function createDOMPopup<State, Event, Command extends object>(options: DOMPopupOptions<State, Event, Command>): Result<DOMPopupConnection<State, Event>> {
  assertPopupWritable(options.root);
  if (!isFocusReturnTarget(options.restoreFocusTarget)) {
    throw new TypeError('Popup focus return requires an element reference.');
  }
  let popup: DOMPopup<State, Event, Command> | undefined;
  const layers = getDOMLayerManager(options.root), layerID = createDOMLayerID();
  const registration = {
    id: layerID, surface: options.root, owner: options.trigger ?? options.root,
    layer: {
      id: layerID,
      mode: options.role === 'tooltip' ? 'tooltip' as const : options.modal === true ? 'modal' as const : 'non-modal' as const,
      dismissOnEscape: options.closeOnEscape !== false,
      dismissOnInteractOutside: options.closeOnInteractOutside === true,
    },
    requestDismiss: (reason: 'escape' | 'interact-outside') => popup?.handleEvent(options.close, popup.inputMethod, reason) ?? false,
    retainExit: options.retainExit === true,
    layerHost: options.layerHost,
    reservation: options.reservation,
    close: () => popup?.closeFromLayer(),
    suspend: () => popup?.suspendFromLayer(),
  };
  let admission: (() => Result<void>) | undefined;
  const clearAdmission = (): void => { admission = undefined; };
  const admit = (state: Result<State>): Result<State> => {
    clearAdmission();
    if (popup !== undefined && (!popup.getActive() || popup.closingFromLayer)) return state;
    if (!state.ok || !options.read(state.value) || layers.getOrder(layerID) !== null) return state;
    const prepared = layers.prepare(registration);
    if (!prepared.ok) return prepared;
    admission = prepared.value;
    return state;
  };
  const register = (): void => {
    const prepared = admission === undefined ? layers.prepare(registration) : { ok: true as const, value: admission };
    clearAdmission();
    const committed = prepared.ok ? prepared.value() : prepared;
    if (!committed.ok) throw new SectileResultError(committed.error);
    registration.reservation = undefined;
  };
  const runtime = createControlledComponentController<State, Event, Command, boolean>({
    controlled: options.controlled,
    initial: admit(options.initial),
    reducer: options.reducer,
    create: (open, state) => admit(options.create(open, state)),
    read: options.read,
    onChange: (open, previous) => {
      let failed = false;
      let firstError: unknown;
      try { popup?.publishCommittedOpen(previous); }
      catch (error) { failed = true; firstError = error; }
      try { options.onOpenChange?.(open, popup?.inputMethod ?? 'programmatic', open ? undefined : popup?.closeReason ?? 'programmatic'); }
      catch (error) { if (!failed) { failed = true; firstError = error; } }
      if (failed) throw firstError;
    },
    interaction: options.interaction,
    ...(options.interactionIntent === undefined ? {} : { interactionIntent: options.interactionIntent }),
  });
  if (!runtime.ok) return runtime;
  const syncHost = (host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode> => layers.transferHost(layerID, host, () => { registration.layerHost = host; });
  const syncPolicy = (next: LayerPolicy): Result<void> => {
    layers.assertWritable();
    if (registration.layer.mode === next.mode && registration.layer.dismissOnEscape === next.dismissOnEscape && registration.layer.dismissOnInteractOutside === next.dismissOnInteractOutside) return okResult(undefined);
    return layers.configure(layerID, next, () => {
      registration.layer.mode = next.mode;
      registration.layer.dismissOnEscape = next.dismissOnEscape;
      registration.layer.dismissOnInteractOutside = next.dismissOnInteractOutside;
    });
  };
  const syncDismissal = (next: PopupDismissalOptions): Result<void> => syncPolicy({ mode: registration.layer.mode,
    dismissOnEscape: next.closeOnEscape, dismissOnInteractOutside: next.closeOnInteractOutside });
  const syncModality = (modal: boolean): Result<void> => syncPolicy({
    mode: options.role === 'tooltip' ? 'tooltip' : modal ? 'modal' : 'non-modal',
    dismissOnEscape: registration.layer.dismissOnEscape, dismissOnInteractOutside: registration.layer.dismissOnInteractOutside,
  });
  popup = new DOMPopup(options, runtime.value, layers, layerID, register, clearAdmission, syncHost, syncDismissal, syncModality);
  popup.initialize();
  return { ok: true, value: popup };
}

class DOMPopup<State, Event, Command extends object> implements DOMPopupConnection<State, Event> {
  readonly #options: DOMPopupOptions<State, Event, Command>;
  readonly #runtime: ControlledComponentController<State, Event, Command, boolean>;
  readonly #click: (event: MouseEvent) => void;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #documentKeydown: (event: KeyboardEvent) => void;
  #focusStartGuard: HTMLElement | undefined;
  #focusEndGuard: HTMLElement | undefined;
  readonly #focusGuard: () => void;
  #focusHover: PopupFocusHoverBinding | undefined;
  readonly #pointerDown: (event: PointerEvent) => void;
  readonly #layerID: string;
  readonly #layers: DOMLayerManager;
  readonly #visibility: HiddenBinding | undefined;
  readonly #register: () => void;
  readonly #clearAdmission: () => void;
  readonly #syncHost: (host: LayerHostConnection | undefined) => Result<void, LayerHostTransferErrorCode>;
  readonly #syncDismissal: (options: PopupDismissalOptions) => Result<void>;
  readonly #syncModality: (modal: boolean) => Result<void>;
  #behavior: PopupBehaviorOptions;
  #closeOnInteractOutside: boolean;
  #modalEffects: ModalEffects | undefined;
  #initialFocusApplied = false;
  #moveFocus: SurfaceMoveFocus | undefined;
  #tabDirection: 'forward' | 'backward' = 'forward';
  #stopPresentation: (() => void) | undefined;
  #publishedRevision = -1;
  #inputMethod: PopupInputMethod = 'programmatic';
  #closeReason: PopupCloseReason = 'programmatic';
  #suspended = false;
  #closingFromLayer = false;
  #disconnected = false;

  public constructor(options: DOMPopupOptions<State, Event, Command>, runtime: ControlledComponentController<State, Event, Command, boolean>, layers: DOMLayerManager, layerID: string, register: () => void, clearAdmission: () => void, syncHost: (host: LayerHostConnection | undefined) => Result<void, LayerHostTransferErrorCode>, syncDismissal: (options: PopupDismissalOptions) => Result<void>, syncModality: (modal: boolean) => Result<void>) {
    this.#options = options;
    this.#runtime = runtime;
    this.#visibility = options.manageVisibility === false ? undefined : createHiddenBinding(options.root);
    this.#layerID = layerID;
    this.#layers = layers;
    this.#register = register;
    this.#clearAdmission = clearAdmission;
    this.#syncHost = syncHost;
    this.#syncDismissal = syncDismissal;
    this.#syncModality = syncModality;
    this.#behavior = {
      modal: options.modal === true, autoFocus: options.autoFocus === true,
      restoreFocus: options.restoreFocus === true, trapFocus: options.trapFocus === true,
      restoreFocusTarget: options.restoreFocusTarget,
      initialFocus: options.initialFocus, label: options.label, labelledBy: options.labelledBy,
      describedBy: options.describedBy, interactOutsideExclusions: options.interactOutsideExclusions?.slice(),
    };
    this.#closeOnInteractOutside = options.closeOnInteractOutside === true;
    this.#click = (event): void => { this.handleEvent(options.toggle, event.detail === 0 ? 'keyboard' : 'pointer'); };
    this.#keydown = (event): void => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        if (this.#dismiss('escape', 'keyboard')) event.preventDefault();
      }
    };
    this.#documentKeydown = (event): void => {
      if (!this.#isOpen()) return;
      if (event.key === 'Tab' && this.#behavior.trapFocus) {
        this.#tabDirection = event.shiftKey ? 'backward' : 'forward';
        this.#ensureFocusGuards();
        return;
      }
      if (event.isComposing || event.key !== 'Escape') return;
      if (this.#dismiss('escape', 'keyboard')) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };
    this.#focusGuard = (): void => {
      if (!this.#isOpen() || !this.#behavior.trapFocus) return;
      const target = this.#tabDirection === 'backward'
        ? lastFocusable(this.#options.root)
        : firstFocusable(this.#options.root);
      focusElement(target ?? this.#options.root);
    };
    this.#pointerDown = (event): void => {
      if (!this.#isOpen()) return;
      if (isEventInside(event, options.root) || (options.trigger !== undefined && isEventInside(event, options.trigger))) return;
      if (this.#behavior.interactOutsideExclusions?.some((element) => isEventInside(event, element)) === true) return;
      if (event.button === 0 && this.#behavior.modal && this.#behavior.trapFocus
        && this.#layers.isOutsideInteractiveLayer(this.#layerID, event)) event.preventDefault();
      if (options.onInteractOutside === undefined && !this.#closeOnInteractOutside) return;
      const outsideEvent = createInteractOutsideEvent(event, options.root);
      options.onInteractOutside?.(outsideEvent);
      if (outsideEvent.defaultPrevented || !this.#closeOnInteractOutside) return;
      this.#dismiss('interact-outside', 'pointer');
    };
  }

  /** Bind the owner reference before native custom-element callbacks can run. */
  public initialize(): void {
    const options = this.#options;
    // Custom-element attribute callbacks may synchronously open another layer.
    // Consume initial admission before the first externally observable DOM write.
    if (this.#isOpen()) this.#register();
    options.root.setAttribute('role', options.role);
    if (options.modal !== undefined) options.root.setAttribute('aria-modal', String(options.modal));
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    if (options.labelledBy !== undefined) options.root.setAttribute('aria-labelledby', options.labelledBy);
    if (options.describedBy !== undefined) options.root.setAttribute('aria-describedby', options.describedBy);
    setInteractionAttributes(options.root, options.interaction);
    if (options.trigger !== undefined) setInteractionAttributes(options.trigger, options.interaction, true);
    if (!this.#suspended && !this.#disconnected) this.#bindNative();
    this.#refresh(false);
  }

  #bindNative(): void {
    const options = this.#options;
    options.root.addEventListener('keydown', this.#keydown);
    options.trigger?.addEventListener('keydown', this.#keydown);
    options.root.ownerDocument?.addEventListener?.('keydown', this.#documentKeydown, true);
    if (options.triggerMode === 'focus-hover') {
      const binding = options.bindFocusHover?.({ readOpen: () => this.#isOpen(),
        request: (open, method) => { this.handleEvent(open ? options.open : options.close, method); } });
      if (this.#disconnected || this.#suspended) { binding?.disconnect(); return; }
      this.#focusHover = binding;
    } else {
      options.trigger?.addEventListener('click', this.#click);
    }
    if (this.#observesOutside()) options.root.ownerDocument?.addEventListener?.('pointerdown', this.#pointerDown, true);
  }

  #unbindNative(): void {
    const options = this.#options;
    options.root.removeEventListener('keydown', this.#keydown);
    options.trigger?.removeEventListener('keydown', this.#keydown);
    options.root.ownerDocument?.removeEventListener?.('keydown', this.#documentKeydown, true);
    options.trigger?.removeEventListener('click', this.#click);
    const binding = this.#focusHover; this.#focusHover = undefined; binding?.disconnect();
    if (this.#observesOutside()) options.root.ownerDocument?.removeEventListener?.('pointerdown', this.#pointerDown, true);
  }

  #observesOutside(): boolean {
    return this.#closeOnInteractOutside || this.#options.onInteractOutside !== undefined
      || (this.#behavior.modal && this.#behavior.trapFocus);
  }

  #syncOutsideSubscription(subscribed: boolean): void {
    const next = this.#observesOutside();
    if (this.#suspended || this.#disconnected || subscribed === next) return;
    const document = this.#options.root.ownerDocument;
    if (next) document?.addEventListener?.('pointerdown', this.#pointerDown, true);
    else document?.removeEventListener?.('pointerdown', this.#pointerDown, true);
  }

  public suspend(): void {
    this.#layers.assertWritable();
    if (this.#disconnected || this.#suspended) return;
    let failed = false, failure: unknown;
    try {
      const result = this.#layers.suspend(this.#layerID);
      if (!result.ok) throw new SectileResultError(result.error);
    } catch (error) { failed = true; failure = error; }
    // Publication callbacks may throw after retirement; native teardown still drains.
    if (this.#layers.getOrder(this.#layerID) === null) {
      try { this.suspendFromLayer(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    }
    if (failed) throw failure;
  }

  public suspendFromLayer(): void {
    if (this.#disconnected || this.#suspended) return;
    this.#moveFocus = undefined;
    this.#suspended = true;
    this.#stopPresentation?.(); this.#stopPresentation = undefined;
    let failed = false, failure: unknown;
    try { this.#unbindNative(); } catch (error) { failed = true; failure = error; }
    try { this.#modalEffects?.release(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    this.#modalEffects = undefined;
    try { this.#removeFocusGuards(true); } catch (error) { if (!failed) { failed = true; failure = error; } }
    try { this.#visibility?.setHidden(true); } catch (error) { if (!failed) { failed = true; failure = error; } }
    try { this.#options.onPresentationSuspend?.(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    if (failed) throw failure;
  }

  public resume(): void {
    this.#layers.assertWritable();
    if (this.#disconnected || !this.#suspended) return;
    try {
      if (this.#isOpen()) this.#register();
      this.#suspended = false;
      this.#initialFocusApplied = this.#isOpen();
      this.#bindNative();
      this.#refresh(undefined);
      this.#options.onPresentationResume?.();
      this.#options.onUpdate?.();
    } catch (error) {
      // Admission may commit before an observer throws. Return any admitted
      // generation and partially rebound native work without closing the model.
      if (!this.#suspended || this.#layers.getOrder(this.#layerID) !== null) {
        this.#suspended = false;
        try { this.suspend(); } catch { /* Preserve the initiating resume failure. */ }
      }
      throw error;
    }
  }

  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public getActive(): boolean { return !this.#suspended && !this.#disconnected; }
  /** Controlled requests keep their old state; publish only accepted transitions. */
  public publishCommittedOpen(previous: boolean): void {
    if (this.#isOpen() !== previous) this.#refresh(previous);
  }
  public closeFromLayer(): void {
    const previous = this.#closeReason;
    this.#closeReason = 'ancestor-closed';
    this.#closingFromLayer = true;
    let failed = false, failure: unknown;
    try {
      try {
        const result = this.#runtime.handle(this.#options.close);
        if (result.ok) for (const command of result.commands) this.#options.command?.(command);
      } catch (error) { failed = true; failure = error; }
      try {
        // A refused close retains its model, not permission to revive a branch
        // whose canonical ancestor has already closed.
        if (this.#isOpen()) this.suspend();
        else this.#refresh(true);
      } catch (error) { if (!failed) { failed = true; failure = error; } }
      try { this.#options.onUpdate?.(); }
      catch (error) { if (!failed) { failed = true; failure = error; } }
    } finally { this.#closeReason = previous; this.#closingFromLayer = false; }
    if (failed) throw failure;
  }
  public get closingFromLayer(): boolean { return this.#closingFromLayer; }
  public getLayerOrder(): number | null { return this.#layers.getOrder(this.#layerID); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    const result = this.#layers.subscribePresentation(this.#layerID, listener);
    if (result.ok) this.#stopPresentation = result.value;
    return result;
  }
  public completeLayerExit(generation: number): Result<void> { return this.#layers.completeExit(this.#layerID, generation); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#layers.reparent(this.#layerID, parent); }
  public syncLayerHost(host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode> { return this.#syncHost(host); }
  public syncDismissal(options: PopupDismissalOptions): Result<void> {
    const nextOptions = { closeOnEscape: options.closeOnEscape, closeOnInteractOutside: options.closeOnInteractOutside };
    const result = this.#syncDismissal(nextOptions);
    if (!result.ok) return result;
    const subscribed = this.#observesOutside();
    this.#closeOnInteractOutside = nextOptions.closeOnInteractOutside;
    this.#syncOutsideSubscription(subscribed);
    return result;
  }
  public syncBehavior(options: PopupBehaviorOptions): Result<void, PopupBehaviorErrorCode> {
    this.#layers.assertWritable();
    const next: PopupBehaviorOptions = {
      modal: options.modal, autoFocus: options.autoFocus, restoreFocus: options.restoreFocus, trapFocus: options.trapFocus,
      restoreFocusTarget: options.restoreFocusTarget === undefined ? this.#behavior.restoreFocusTarget : options.restoreFocusTarget,
      label: options.label, labelledBy: options.labelledBy, describedBy: options.describedBy,
      initialFocus: options.initialFocus, interactOutsideExclusions: options.interactOutsideExclusions?.slice(),
    };
    if (typeof next.modal !== 'boolean' || typeof next.autoFocus !== 'boolean' || typeof next.restoreFocus !== 'boolean' || typeof next.trapFocus !== 'boolean'
      || (next.label !== undefined && typeof next.label !== 'string')
      || (next.labelledBy !== undefined && typeof next.labelledBy !== 'string')
      || (next.describedBy !== undefined && typeof next.describedBy !== 'string')
      || !isFocusReturnTarget(next.restoreFocusTarget)
      || (this.#options.role === 'alertdialog' && !next.modal)
      || (this.#options.role === 'tooltip' && (next.modal || next.autoFocus || next.restoreFocus || next.trapFocus))) {
      return failResult('construction', 'dom.popup-options-invalid', 'Popup behavior requires complete boolean flags, valid native labels and its role-owned modality/focus contract.');
    }
    const result = this.#syncModality(next.modal);
    if (!result.ok) return result;
    const previous = this.#behavior;
    const subscribed = this.#observesOutside();
    this.#behavior = next;
    this.#syncOutsideSubscription(subscribed);
    // Configuration is not a new opening and must not steal the current focus.
    if (this.#isOpen() && (previous.autoFocus !== next.autoFocus || previous.initialFocus !== next.initialFocus)) {
      this.#initialFocusApplied = true;
    }
    const root = this.#options.root;
    if (this.#options.role !== 'tooltip') root.setAttribute('aria-modal', String(next.modal));
    for (const [key, attribute] of [['label', 'aria-label'], ['labelledBy', 'aria-labelledby'], ['describedBy', 'aria-describedby']] as const) {
      if (next[key] !== undefined) root.setAttribute(attribute, next[key]);
      else if (previous[key] !== undefined) root.removeAttribute(attribute);
    }
    if (!this.#suspended && !this.#disconnected && this.#isOpen()) this.#ensureFocusGuards();
    else if (!next.trapFocus) this.#removeFocusGuards(true);
    const beforeBranches = previous.interactOutsideExclusions ?? [];
    const afterBranches = next.interactOutsideExclusions ?? [];
    if (previous.modal !== next.modal || previous.trapFocus !== next.trapFocus
      || beforeBranches.length !== afterBranches.length || beforeBranches.some((branch, index) => branch !== afterBranches[index])) this.#syncModalEffects();
    return result;
  }
  public syncDisabled(disabled: boolean): Result<void> {
    this.#layers.assertWritable();
    const result = this.#runtime.syncInteraction({ disabled });
    if (!result.ok) return result;
    setInteractionAttributes(this.#options.root, result.value);
    if (this.#options.trigger !== undefined) setInteractionAttributes(this.#options.trigger, result.value, true);
    return okResult(undefined);
  }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> {
    this.#layers.assertWritable();
    const previous = this.#isOpen();
    try {
      const result = this.#runtime.syncControlledValue(open);
      if (result.ok) { this.#refresh(previous); this.#options.onUpdate?.(); }
      return result;
    } finally { this.#clearAdmission(); }
  }
  public get inputMethod(): PopupInputMethod { return this.#inputMethod; }
  public get closeReason(): PopupCloseReason { return this.#closeReason; }
  #dismiss(reason: 'escape' | 'interact-outside', inputMethod: PopupInputMethod): boolean {
    const previous = this.#inputMethod;
    this.#inputMethod = inputMethod;
    try { return this.#layers.dismiss(this.#layerID, reason); }
    finally { this.#inputMethod = previous; }
  }
  public handleEvent(event: Event, inputMethod: PopupInputMethod = 'programmatic', reason: PopupCloseReason = 'programmatic'): boolean {
    if (inputMethod !== 'keyboard' && inputMethod !== 'pointer' && inputMethod !== 'programmatic') return false;
    if (reason !== 'escape' && reason !== 'interact-outside' && reason !== 'close-button' && reason !== 'programmatic' && reason !== 'ancestor-closed' && reason !== 'swipe') return false;
    const previous = this.#inputMethod;
    const previousReason = this.#closeReason;
    this.#inputMethod = inputMethod;
    this.#closeReason = reason;
    try { return this.#handleEvent(event); }
    finally { this.#inputMethod = previous; this.#closeReason = previousReason; }
  }
  #handleEvent(event: Event): boolean {
    this.#layers.assertWritable();
    const previous = this.#isOpen();
    let accepted = false;
    let failed = false;
    let firstError: unknown;
    try {
      const result = this.#runtime.handle(event);
      accepted = result.ok;
      if (result.ok) for (const command of result.commands) this.#options.command?.(command);
    } catch (error) { failed = true; firstError = error; }
    // The controller may have committed before an application callback failed.
    // Complete its host projection and retain the original failure.
    try {
      this.#refresh(previous);
      if (accepted) this.#options.onUpdate?.();
    } catch (error) { if (!failed) { failed = true; firstError = error; } }
    this.#clearAdmission();
    if (failed) throw firstError;
    return accepted;
  }
  public refresh(): void { this.#layers.assertWritable(); this.#refresh(undefined); }
  public prepareMove(): void {
    this.#layers.assertWritable();
    this.#moveFocus = undefined;
    if (!this.getActive() || !this.#isOpen()) return;
    this.#moveFocus = captureSurfaceMoveFocus(this.#options.root, this.#runtime.getSnapshot().revision);
  }
  public completeMove(restoreFocus = true): void {
    this.#layers.assertWritable();
    const held = this.#moveFocus; this.#moveFocus = undefined;
    if (!restoreFocus || !this.getActive() || !this.#isOpen()) return;
    if (held && held.scope !== this.#options.root.getRootNode()) return;
    this.#refresh(undefined, true);
    if (!this.getActive() || !this.#isOpen()) return;
    restoreSurfaceMoveFocus(this.#options.root, held, this.#runtime.getSnapshot().revision);
  }
  public disconnect(): void {
    this.#layers.assertWritable();
    if (this.#disconnected) return;
    this.#disconnected = true;
    this.#moveFocus = undefined;
    this.#clearAdmission();
    if (this.#options.reservation !== undefined) this.#layers.releaseReservation(this.#options.reservation);
    this.#stopPresentation?.();
    this.#stopPresentation = undefined;
    let failed = false;
    let firstError: unknown;
    try { if (this.#isOpen()) this.#layers.close(this.#layerID); }
    catch (error) { failed = true; firstError = error; }
    try {
      const generation = this.#layers.getGeneration(this.#layerID);
      if (generation !== undefined) this.#layers.completeExit(this.#layerID, generation);
    } catch (error) { if (!failed) { failed = true; firstError = error; } }
    finally {
      this.#unbindNative();
      this.#modalEffects?.release();
      this.#modalEffects = undefined;
      this.#removeFocusGuards(true);
      this.#visibility?.disconnect();
    }
    if (failed) throw firstError;
  }
  #isOpen(): boolean { return this.#options.read(this.#runtime.getSnapshot().state); }
  #refresh(previous: boolean | undefined, preserveFocus = false): void {
    if (this.#suspended || this.#disconnected) { this.#visibility?.setHidden(true); return; }
    const revision = this.#runtime.getSnapshot().revision;
    // A committed change is projected before callbacks; its outer drain must
    // not repeat focus effects. Explicit refresh still reconciles external DOM.
    if (previous !== undefined && this.#publishedRevision === revision) return;
    this.#publishedRevision = revision;
    const open = this.#isOpen();
    if (!open) this.#focusHover?.cancelPending();
    try {
      if (open && previous !== true) {
        if (this.#layers.getOrder(this.#layerID) === null) this.#register();
        this.#ensureFocusGuards();
        this.#syncModalEffects();
      } else if (!open && previous === true) {
        try { this.#layers.close(this.#layerID); }
        finally {
          this.#modalEffects?.release();
          this.#modalEffects = undefined;
          this.#removeFocusGuards();
        }
      }
    } finally {
      this.#visibility?.setHidden(!open);
      if (this.#options.trigger !== undefined && this.#options.triggerMode !== 'focus-hover') this.#options.trigger.setAttribute('aria-expanded', String(open));
      if (!open) { this.#initialFocusApplied = false; this.#moveFocus = undefined; }
      if (open) { if (!preserveFocus) this.#applyInitialFocus(); }
      else if (previous === true && this.#behavior.restoreFocus) {
        const target = this.#behavior.restoreFocusTarget;
        if (target == null) focusElement(this.#options.trigger);
        else if (target.ownerDocument === this.#options.root.ownerDocument && target.isConnected
          && !this.#options.root.contains(target) && !target.closest('[inert],[hidden],[aria-hidden="true"],:disabled')) focusElement(target);
      }
    }
  }
  #applyInitialFocus(): void {
    if (this.#initialFocusApplied || !this.#behavior.autoFocus || this.#options.root.hidden) return;
    const target = this.#behavior.initialFocus ?? firstFocusable(this.#options.root) ?? this.#options.root;
    focusElement(target);
    this.#initialFocusApplied = this.#options.root.ownerDocument?.activeElement === target;
  }
  #ensureFocusGuards(): void {
    if (!this.#behavior.trapFocus) { this.#removeFocusGuards(true); return; }
    if (this.#focusStartGuard === undefined) {
      this.#focusStartGuard = createFocusGuard(this.#options.root, 'start');
      this.#focusStartGuard?.addEventListener('focus', this.#focusGuard);
    }
    if (this.#focusEndGuard === undefined) {
      this.#focusEndGuard = createFocusGuard(this.#options.root, 'end');
      this.#focusEndGuard?.addEventListener('focus', this.#focusGuard);
    }
    const parent = this.#options.root.parentNode;
    if (parent === null || this.#focusStartGuard === undefined || this.#focusEndGuard === undefined) return;
    if (this.#focusStartGuard.parentNode !== parent || this.#focusStartGuard.nextSibling !== this.#options.root) {
      parent.insertBefore(this.#focusStartGuard, this.#options.root);
    }
    if (this.#focusEndGuard.parentNode !== parent || this.#options.root.nextSibling !== this.#focusEndGuard) {
      parent.insertBefore(this.#focusEndGuard, this.#options.root.nextSibling);
    }
  }
  #removeFocusGuards(release = false): void {
    this.#focusStartGuard?.remove();
    this.#focusEndGuard?.remove();
    if (release) {
      this.#focusStartGuard?.removeEventListener('focus', this.#focusGuard);
      this.#focusEndGuard?.removeEventListener('focus', this.#focusGuard);
      this.#focusStartGuard = undefined; this.#focusEndGuard = undefined;
    }
  }
  #syncModalEffects(): void {
    if (this.#suspended || this.#disconnected || !this.#isOpen() || !this.#behavior.modal) {
      this.#modalEffects?.release(); this.#modalEffects = undefined; return;
    }
    const branches = [
      ...(this.#options.modalBranches ?? []), ...(this.#behavior.interactOutsideExclusions ?? []),
      ...(this.#focusStartGuard === undefined ? [] : [this.#focusStartGuard]),
      ...(this.#focusEndGuard === undefined ? [] : [this.#focusEndGuard]),
    ];
    if (this.#modalEffects) this.#modalEffects.update(branches);
    else this.#modalEffects = acquireModalEffects(this.#options.root, branches, () => this.getLayerOrder());
  }
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]';
function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
}
function firstFocusable(root: HTMLElement): HTMLElement | null { return focusable(root)[0] ?? null; }
function lastFocusable(root: HTMLElement): HTMLElement | null { return focusable(root).at(-1) ?? null; }
function focusElement(element: HTMLElement | undefined): void { element?.focus?.({ preventScroll: true }); }
function createFocusGuard(root: HTMLElement, edge: 'start' | 'end'): HTMLElement | undefined {
  const createElement = root.ownerDocument?.createElement;
  if (typeof createElement !== 'function') return undefined;
  const guard = createElement.call(root.ownerDocument, 'span');
  guard.tabIndex = 0;
  guard.setAttribute('aria-hidden', 'true');
  guard.setAttribute('data-sectile-focus-guard', edge);
  guard.style.position = 'fixed';
  guard.style.width = '1px';
  guard.style.height = '1px';
  guard.style.padding = '0';
  guard.style.margin = '-1px';
  guard.style.overflow = 'hidden';
  guard.style.clip = 'rect(0, 0, 0, 0)';
  guard.style.whiteSpace = 'nowrap';
  guard.style.border = '0';
  return guard;
}
