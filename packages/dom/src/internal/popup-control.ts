import type { Result } from '@sectile/core';
import type { InteractionStateInput } from '@sectile/core/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import {
  createControlledComponentController,
  type ControlledComponentController,
} from '@sectile/core/adapter-runtime';
import { setInteractionAttributes } from './interaction.js';
import {
  createDOMLayerID,
  getDOMLayerManager,
  type DOMLayerManager,
} from './layer-manager.js';
import { acquireModalEffects, type ModalEffects } from './modal-effects.js';
import { createHiddenBinding, type HiddenBinding } from './hidden-binding.js';
import {
  createInteractOutsideEvent,
  isEventInside,
  type InteractOutsideHandler,
} from '../interact-outside.js';

export interface DOMPopupConnection<State, Event> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event): boolean;
  refresh(): void;
  disconnect(): void;
}

export interface DOMPopupOptions<State, Event, Command extends object> {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly role: 'dialog' | 'alertdialog' | 'tooltip';
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly controlled: boolean;
  readonly initial: Result<State>;
  readonly open: Event;
  readonly toggle: Event;
  readonly close: Event;
  readonly reducer: (state: State, event: Event) => Result<MachineUpdate<State, Command>>;
  readonly create: (open: boolean, state: State) => Result<State>;
  readonly read: (state: State) => boolean;
  readonly triggerMode?: 'click' | 'focus-hover';
  readonly tooltipID?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly modalBranches?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly command?: (command: Command) => void;
  readonly onUpdate?: (() => void) | undefined;
  readonly interaction?: InteractionStateInput;
  readonly manageVisibility?: boolean;
}

export function createDOMPopup<State, Event, Command extends object>(options: DOMPopupOptions<State, Event, Command>): Result<DOMPopupConnection<State, Event>> {
  const runtime = createControlledComponentController<State, Event, Command, boolean>({
    controlled: options.controlled,
    initial: options.initial,
    reducer: options.reducer,
    create: options.create,
    read: options.read,
    onChange: (open) => options.onOpenChange?.(open),
    ...(options.interaction === undefined ? {} : { interaction: options.interaction }),
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMPopup(options, runtime.value) };
}

class DOMPopup<State, Event, Command extends object> implements DOMPopupConnection<State, Event> {
  readonly #options: DOMPopupOptions<State, Event, Command>;
  readonly #runtime: ControlledComponentController<State, Event, Command, boolean>;
  readonly #click: () => void;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #documentKeydown: (event: KeyboardEvent) => void;
  readonly #focusStartGuard: HTMLElement | undefined;
  readonly #focusEndGuard: HTMLElement | undefined;
  readonly #focusGuard: () => void;
  readonly #focusIn: () => void;
  readonly #focusOut: () => void;
  readonly #pointerEnter: () => void;
  readonly #pointerLeave: () => void;
  readonly #pointerDown: (event: PointerEvent) => void;
  readonly #layerID: string;
  readonly #layers: DOMLayerManager;
  readonly #visibility: HiddenBinding | undefined;
  #modalEffects: ModalEffects | undefined;
  #initialFocusApplied = false;
  #tabDirection: 'forward' | 'backward' = 'forward';
  #focused = false;
  #hovered = false;

  public constructor(options: DOMPopupOptions<State, Event, Command>, runtime: ControlledComponentController<State, Event, Command, boolean>) {
    this.#options = options;
    this.#runtime = runtime;
    this.#visibility = options.manageVisibility === false ? undefined : createHiddenBinding(options.root);
    this.#layerID = createDOMLayerID();
    this.#layers = getDOMLayerManager(options.root);
    this.#click = (): void => { this.handleEvent(options.toggle); };
    this.#keydown = (event): void => {
      if (event.isComposing) return;
      if (event.key === 'Escape') {
        if (this.#layers.dismiss(this.#layerID, 'escape')) event.preventDefault();
      }
    };
    this.#documentKeydown = (event): void => {
      if (!this.#isOpen()) return;
      if (event.key === 'Tab' && options.trapFocus === true) {
        this.#tabDirection = event.shiftKey ? 'backward' : 'forward';
        this.#ensureFocusGuards();
        return;
      }
      if (event.isComposing || event.key !== 'Escape') return;
      if (this.#layers.dismiss(this.#layerID, 'escape')) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };
    this.#focusStartGuard = options.trapFocus === true ? createFocusGuard(options.root, 'start') : undefined;
    this.#focusEndGuard = options.trapFocus === true ? createFocusGuard(options.root, 'end') : undefined;
    this.#focusGuard = (): void => {
      if (!this.#isOpen()) return;
      const target = this.#tabDirection === 'backward'
        ? lastFocusable(this.#options.root)
        : firstFocusable(this.#options.root);
      focusElement(target ?? this.#options.root);
    };
    this.#focusStartGuard?.addEventListener('focus', this.#focusGuard);
    this.#focusEndGuard?.addEventListener('focus', this.#focusGuard);
    this.#focusIn = (): void => { this.#focused = true; this.handleEvent(options.open); };
    this.#focusOut = (): void => { this.#focused = false; if (!this.#hovered) this.handleEvent(options.close); };
    this.#pointerEnter = (): void => { this.#hovered = true; this.handleEvent(options.open); };
    this.#pointerLeave = (): void => { this.#hovered = false; if (!this.#focused) this.handleEvent(options.close); };
    this.#pointerDown = (event): void => {
      if (!this.#isOpen()) return;
      if (isEventInside(event, options.root) || (options.trigger !== undefined && isEventInside(event, options.trigger))) return;
      if (options.interactOutsideExclusions?.some((element) => isEventInside(event, element)) === true) return;
      const outsideEvent = createInteractOutsideEvent(event, options.root);
      options.onInteractOutside?.(outsideEvent);
      if (outsideEvent.defaultPrevented || options.closeOnInteractOutside !== true) return;
      this.#layers.dismiss(this.#layerID, 'interact-outside');
    };
    options.root.setAttribute('role', options.role);
    if (options.modal !== undefined) options.root.setAttribute('aria-modal', String(options.modal));
    if (options.label !== undefined) options.root.setAttribute('aria-label', options.label);
    if (options.labelledBy !== undefined) options.root.setAttribute('aria-labelledby', options.labelledBy);
    if (options.describedBy !== undefined) options.root.setAttribute('aria-describedby', options.describedBy);
    setInteractionAttributes(options.root, options.interaction ?? {});
    if (options.trigger !== undefined) setInteractionAttributes(options.trigger, options.interaction ?? {}, { native: true });
    options.root.addEventListener('keydown', this.#keydown);
    options.trigger?.addEventListener('keydown', this.#keydown);
    options.root.ownerDocument?.addEventListener?.('keydown', this.#documentKeydown, true);
    if (options.triggerMode === 'focus-hover') {
      options.trigger?.addEventListener('focus', this.#focusIn);
      options.trigger?.addEventListener('blur', this.#focusOut);
      options.trigger?.addEventListener('mouseenter', this.#pointerEnter);
      options.trigger?.addEventListener('mouseleave', this.#pointerLeave);
      if (options.tooltipID !== undefined) {
        options.root.id = options.tooltipID;
        options.trigger?.setAttribute('aria-describedby', options.tooltipID);
      }
    } else {
      options.trigger?.addEventListener('click', this.#click);
    }
    if (options.closeOnInteractOutside === true || options.onInteractOutside !== undefined) options.root.ownerDocument?.addEventListener?.('pointerdown', this.#pointerDown, true);
    this.#refresh(false);
  }

  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> {
    const previous = this.#isOpen();
    const result = this.#runtime.syncControlledValue(open);
    if (result.ok) { this.#refresh(previous); this.#options.onUpdate?.(); }
    return result;
  }
  public handleEvent(event: Event): boolean {
    const previous = this.#isOpen();
    const result = this.#runtime.handle(event);
    if (result.ok) for (const command of result.commands) this.#options.command?.(command);
    this.#refresh(previous);
    if (result.ok) this.#options.onUpdate?.();
    return result.ok;
  }
  public refresh(): void { this.#refresh(undefined); }
  public disconnect(): void {
    if (this.#isOpen()) this.#layers.close(this.#layerID);
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.trigger?.removeEventListener('keydown', this.#keydown);
    this.#focusStartGuard?.removeEventListener('focus', this.#focusGuard);
    this.#focusEndGuard?.removeEventListener('focus', this.#focusGuard);
    this.#options.root.ownerDocument?.removeEventListener?.('keydown', this.#documentKeydown, true);
    this.#options.trigger?.removeEventListener('click', this.#click);
    this.#options.trigger?.removeEventListener('focus', this.#focusIn);
    this.#options.trigger?.removeEventListener('blur', this.#focusOut);
    this.#options.trigger?.removeEventListener('mouseenter', this.#pointerEnter);
    this.#options.trigger?.removeEventListener('mouseleave', this.#pointerLeave);
    if (this.#options.closeOnInteractOutside === true || this.#options.onInteractOutside !== undefined) this.#options.root.ownerDocument?.removeEventListener?.('pointerdown', this.#pointerDown, true);
    this.#modalEffects?.release();
    this.#modalEffects = undefined;
    this.#removeFocusGuards();
    this.#visibility?.disconnect();
  }
  #isOpen(): boolean { return this.#options.read(this.#runtime.getSnapshot().state); }
  #refresh(previous: boolean | undefined): void {
    const open = this.#isOpen();
    if (open && previous !== true) {
      this.#ensureFocusGuards();
      if (this.#options.modal === true && this.#modalEffects === undefined) {
        this.#modalEffects = acquireModalEffects(this.#options.root, [
          ...(this.#options.modalBranches ?? []),
          ...(this.#options.interactOutsideExclusions ?? []),
          ...(this.#focusStartGuard === undefined ? [] : [this.#focusStartGuard]),
          ...(this.#focusEndGuard === undefined ? [] : [this.#focusEndGuard]),
        ]);
      }
      this.#layers.register({
        id: this.#layerID,
        surface: this.#options.root,
        owner: this.#options.trigger ?? this.#options.root,
        layer: {
          id: this.#layerID,
          mode: this.#options.role === 'tooltip'
            ? 'tooltip'
            : this.#options.modal === true ? 'modal' : 'non-modal',
          dismissOnEscape: true,
          dismissOnInteractOutside: this.#options.closeOnInteractOutside === true,
        },
        close: () => {
          const result = this.#runtime.handle(this.#options.close);
          if (result.ok) {
            for (const command of result.commands) this.#options.command?.(command);
            this.#options.onUpdate?.();
          }
          this.#refresh(this.#isOpen() ? false : true);
        },
      });
    } else if (!open && previous === true) {
      this.#layers.close(this.#layerID);
      this.#modalEffects?.release();
      this.#modalEffects = undefined;
      this.#removeFocusGuards();
    }
    this.#visibility?.setHidden(!open);
    if (this.#options.trigger !== undefined && this.#options.triggerMode !== 'focus-hover') this.#options.trigger.setAttribute('aria-expanded', String(open));
    if (!open) this.#initialFocusApplied = false;
    if (open) this.#applyInitialFocus();
    else if (previous === true && this.#options.restoreFocus === true) focusElement(this.#options.trigger);
  }
  #applyInitialFocus(): void {
    if (this.#initialFocusApplied || this.#options.autoFocus !== true || this.#options.root.hidden) return;
    const target = this.#options.initialFocus ?? firstFocusable(this.#options.root) ?? this.#options.root;
    focusElement(target);
    this.#initialFocusApplied = this.#options.root.ownerDocument?.activeElement === target;
  }
  #ensureFocusGuards(): void {
    const parent = this.#options.root.parentNode;
    if (parent === null || this.#focusStartGuard === undefined || this.#focusEndGuard === undefined) return;
    if (this.#focusStartGuard.parentNode !== parent || this.#focusStartGuard.nextSibling !== this.#options.root) {
      parent.insertBefore(this.#focusStartGuard, this.#options.root);
    }
    if (this.#focusEndGuard.parentNode !== parent || this.#options.root.nextSibling !== this.#focusEndGuard) {
      parent.insertBefore(this.#focusEndGuard, this.#options.root.nextSibling);
    }
  }
  #removeFocusGuards(): void {
    this.#focusStartGuard?.remove();
    this.#focusEndGuard?.remove();
  }
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]';
function focusable(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
}
function firstFocusable(root: HTMLElement): HTMLElement | null { return focusable(root)[0] ?? null; }
function lastFocusable(root: HTMLElement): HTMLElement | null { return focusable(root).at(-1) ?? null; }
function focusElement(element: HTMLElement | undefined): void { element?.focus?.(); }
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
