import type { Result } from '@sectile/core';
import type { InteractionStateInput } from '@sectile/core/interaction';
import type { MachineUpdate, RevisionSnapshot } from '@sectile/core/revision';
import { createSemanticController, type SemanticController } from './semantic-controller.js';
import { setInteractionAttributes } from './interaction.js';

export interface DOMPopupConnection<State, Event> {
  getSnapshot(): RevisionSnapshot<State>;
  syncControlledValue(open: boolean): Result<RevisionSnapshot<State>>;
  handleEvent(event: Event): boolean;
  refresh(): void;
  disconnect(): void;
}

export interface DOMPopupOptions<State, Event, Command> {
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
  readonly create: (open: boolean) => Result<State>;
  readonly read: (state: State) => boolean;
  readonly triggerMode?: 'click' | 'focus-hover';
  readonly tooltipID?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly onOpenChange?: ((open: boolean) => void) | undefined;
  readonly command?: (command: Command) => void;
  readonly onUpdate?: (() => void) | undefined;
  readonly interaction?: InteractionStateInput;
}

export function createDOMPopup<State, Event, Command>(options: DOMPopupOptions<State, Event, Command>): Result<DOMPopupConnection<State, Event>> {
  const runtime = createSemanticController<State, Event, Command, Command>({
    initial: options.initial,
    reducer: options.reducer,
    reconcile: (previous, proposed) => options.create(options.controlled ? options.read(previous) : options.read(proposed)),
    notify: (previous, proposed) => { if (options.read(previous) !== options.read(proposed)) options.onOpenChange?.(options.read(proposed)); },
    toEffect: (command) => command,
    interaction: options.interaction,
  });
  if (!runtime.ok) return runtime;
  return { ok: true, value: new DOMPopup(options, runtime.value) };
}

class DOMPopup<State, Event, Command> implements DOMPopupConnection<State, Event> {
  readonly #options: DOMPopupOptions<State, Event, Command>;
  readonly #runtime: SemanticController<State, Event, Command>;
  readonly #click: () => void;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #focusIn: () => void;
  readonly #focusOut: () => void;
  readonly #pointerEnter: () => void;
  readonly #pointerLeave: () => void;
  readonly #pointerDown: (event: PointerEvent) => void;
  #focused = false;
  #hovered = false;

  public constructor(options: DOMPopupOptions<State, Event, Command>, runtime: SemanticController<State, Event, Command>) {
    this.#options = options;
    this.#runtime = runtime;
    this.#click = (): void => { this.handleEvent(options.toggle); };
    this.#keydown = (event): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.handleEvent(options.close);
      } else if (event.key === 'Tab' && options.trapFocus === true && this.#isOpen()) {
        this.#trapTab(event);
      }
    };
    this.#focusIn = (): void => { this.#focused = true; this.handleEvent(options.open); };
    this.#focusOut = (): void => { this.#focused = false; if (!this.#hovered) this.handleEvent(options.close); };
    this.#pointerEnter = (): void => { this.#hovered = true; this.handleEvent(options.open); };
    this.#pointerLeave = (): void => { this.#hovered = false; if (!this.#focused) this.handleEvent(options.close); };
    this.#pointerDown = (event): void => {
      if (!this.#isOpen() || options.closeOnInteractOutside !== true) return;
      const target = event.target;
      if (target instanceof Node && (options.root.contains(target) || options.trigger?.contains(target) === true)) return;
      this.handleEvent(options.close);
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
    if (options.closeOnInteractOutside === true && typeof document !== 'undefined') {
      document.addEventListener('pointerdown', this.#pointerDown, true);
    }
    this.#refresh(false);
  }

  public getSnapshot(): RevisionSnapshot<State> { return this.#runtime.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> {
    if (!this.#options.controlled) return { ok: false, error: { class: 'construction', code: 'uncontrolled-controller-sync', message: 'An uncontrolled popup cannot be synchronized externally.' } };
    const previous = this.#isOpen();
    const result = this.#runtime.replace(this.#options.create(open));
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
    this.#options.root.removeEventListener('keydown', this.#keydown);
    this.#options.trigger?.removeEventListener('keydown', this.#keydown);
    this.#options.trigger?.removeEventListener('click', this.#click);
    this.#options.trigger?.removeEventListener('focus', this.#focusIn);
    this.#options.trigger?.removeEventListener('blur', this.#focusOut);
    this.#options.trigger?.removeEventListener('mouseenter', this.#pointerEnter);
    this.#options.trigger?.removeEventListener('mouseleave', this.#pointerLeave);
    if (this.#options.closeOnInteractOutside === true && typeof document !== 'undefined') {
      document.removeEventListener('pointerdown', this.#pointerDown, true);
    }
  }
  #isOpen(): boolean { return this.#options.read(this.#runtime.getSnapshot().state); }
  #refresh(previous: boolean | undefined): void {
    const open = this.#isOpen();
    this.#options.root.hidden = !open;
    if (this.#options.trigger !== undefined && this.#options.triggerMode !== 'focus-hover') this.#options.trigger.setAttribute('aria-expanded', String(open));
    if (previous === open || previous === undefined) return;
    if (open && this.#options.autoFocus === true) focusElement(this.#options.initialFocus ?? firstFocusable(this.#options.root) ?? this.#options.root);
    else if (!open && this.#options.restoreFocus === true) focusElement(this.#options.trigger);
  }
  #trapTab(event: KeyboardEvent): void {
    if (typeof document === 'undefined') return;
    const focusable = [...this.#options.root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((element) => !element.hasAttribute('disabled') && element.tabIndex >= 0);
    if (focusable.length === 0) { event.preventDefault(); this.#options.root.focus(); return; }
    const activeIndex = focusable.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.shiftKey ? activeIndex <= 0 ? focusable.length - 1 : activeIndex - 1 : activeIndex < 0 || activeIndex === focusable.length - 1 ? 0 : activeIndex + 1;
    event.preventDefault();
    focusable[nextIndex]?.focus();
  }
}

const FOCUSABLE = 'button,[href],input,select,textarea,[tabindex]';
function firstFocusable(root: HTMLElement): HTMLElement | null { return root.querySelectorAll?.<HTMLElement>(FOCUSABLE)[0] ?? null; }
function focusElement(element: HTMLElement | undefined): void { element?.focus?.(); }
