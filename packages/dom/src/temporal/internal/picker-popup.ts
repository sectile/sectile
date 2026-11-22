import { failResult, okResult, type Result } from '@sectile/core/result';
import { createHiddenBinding, type HiddenBinding } from '../../interaction/visibility.js';
import { setInteractionAttributes } from '../../interaction/attributes.js';
import { createDOMLayerBinding, type DOMLayerBinding, type DOMLayerBindingOptions, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription, type DOMLayerReparentErrorCode } from '../../overlay/layer/binding.js';
import { createPickerPosition, type PickerPositionOptions } from '../../overlay/position/picker.js';
import type { PositionConnection } from '../../overlay/position/connection.js';
import { focusDatePickerEntry } from './date-picker-cell.js';

export interface PickerPopupElements {
  readonly root: HTMLElement;
  readonly trigger: HTMLElement;
  readonly grid: HTMLElement;
  readonly anchor?: HTMLElement;
}

type PopupOptions = PickerPositionOptions & {
  readonly layerHost?: DOMLayerBindingOptions['layerHost'];
  readonly manageVisibility?: boolean;
  readonly disabled?: boolean;
  readonly readOnly?: boolean;
  readonly label?: string;
};

interface PopupOwner {
  readOpen(): boolean;
  close(restoreFocus: boolean): void;
  trigger(): void;
  keydown(event: KeyboardEvent): void;
  click(event: MouseEvent): void;
  suspend(): void;
  resume(): void;
}

interface Surface {
  readonly elements: PickerPopupElements;
  layer?: DOMLayerBinding;
  position?: PositionConnection;
  hidden?: HiddenBinding;
  bound: boolean;
}

/** Owns only optional popup resources. Switching surfaces never transfers native text editing. */
export class PickerPopup {
  #surface: Surface | null = null;
  #active = true;
  #disposed = false;
  #generation = 0;
  readonly #options: PopupOptions;
  readonly #owner: PopupOwner;

  constructor(options: PopupOptions, owner: PopupOwner) {
    this.#options = options;
    this.#owner = owner;
    this.#active = options.layerHost !== null && options.layerHost?.active !== false;
  }

  get elements(): PickerPopupElements | null { return this.#surface?.elements ?? null; }
  getActive(): boolean { return !this.#disposed && this.#active && (this.#surface?.layer?.getActive() ?? true); }
  getLayerOrder(): number | null { return this.#surface?.layer?.getLayerOrder() ?? null; }
  subscribe(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    return this.#surface?.layer?.subscribeLayerPresentation(listener)
      ?? failResult('transition-rejection', 'dom.layer-inactive', 'No picker popup is attached.');
  }
  reparent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> {
    return this.#surface?.layer?.syncLayerParent(parent) ?? okResult(undefined);
  }

  attach(elements: PickerPopupElements | null): void {
    const current = this.#surface?.elements;
    if (this.#disposed || (current?.root === elements?.root && current?.trigger === elements?.trigger &&
      current?.grid === elements?.grid && current?.anchor === elements?.anchor)) return;
    this.#detach();
    if (elements === null) return;
    const { root, grid, trigger } = elements;
    const surface: Surface = { elements, bound: false };
    this.#surface = surface;
    try {
      if (this.#options.manageVisibility !== false) surface.hidden = createHiddenBinding(root);
      surface.layer = createDOMLayerBinding({
        surface: root, owner: trigger,
        ...(this.#options.layerHost === undefined ? {} : { layerHost: this.#options.layerHost }),
        dismissOnInteractOutside: true, readOpen: this.#owner.readOpen,
        close: reason => { if (this.#surface === surface) this.#owner.close(reason === 'escape'); },
        presentation: {
          suspend: () => {
            if (this.#surface !== surface) return;
            this.#active = false;
            this.#generation++;
            this.#unbind(surface);
            surface.position?.disconnect();
            surface.hidden?.setHidden(true);
            this.#owner.suspend();
          },
          resume: () => {
            if (this.#surface !== surface) return;
            this.#active = true;
            this.#bind(surface);
            this.#owner.resume();
            this.refresh();
          },
        },
      });
      surface.position = createPickerPosition(root, trigger, elements.anchor === undefined
        ? this.#options : { ...this.#options, anchor: elements.anchor });
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'false');
      grid.setAttribute('role', 'grid');
      setInteractionAttributes(trigger, this.#options, true);
      setInteractionAttributes(grid, this.#options);
      if (this.#options.label !== undefined) grid.setAttribute('aria-label', this.#options.label);
      if (this.getActive()) this.#bind(surface);
      else surface.layer.suspend();
      this.refresh();
    } catch (error) {
      this.#detach();
      throw error;
    }
  }

  refresh(): void {
    const surface = this.#surface;
    if (surface === null) return;
    const open = this.#owner.readOpen();
    surface.elements.trigger.setAttribute('aria-haspopup', 'dialog');
    surface.elements.trigger.setAttribute('aria-expanded', String(open));
    surface.hidden?.setHidden(!this.getActive() || !open);
    surface.layer?.sync();
    if (this.getActive()) surface.position?.update();
  }

  focusGrid(): void {
    const surface = this.#surface;
    if (surface === null) return;
    const generation = ++this.#generation;
    queueMicrotask(() => {
      if (generation === this.#generation && this.#surface === surface && this.getActive() && this.#owner.readOpen()) {
        focusDatePickerEntry(surface.elements.grid);
      }
    });
  }

  focusTrigger(): void {
    this.#generation++;
    if (this.getActive()) this.elements?.trigger.focus();
  }

  suspend(): void {
    if (!this.#active) return;
    if (this.#surface?.layer) this.#surface.layer.suspend();
    else { this.#active = false; this.#owner.suspend(); }
  }

  resume(): void {
    if (this.#active || this.#disposed) return;
    if (this.#surface?.layer) this.#surface.layer.resume();
    else { this.#active = true; this.#owner.resume(); }
  }

  disconnect(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#detach();
  }

  #detach(): void {
    const old = this.#surface;
    if (old === null) return;
    this.#surface = null;
    this.#generation++;
    this.#unbind(old);
    try { old.layer?.disconnect(); }
    finally { try { old.position?.disconnect(); } finally { old.hidden?.disconnect(); } }
  }

  #bind(surface: Surface): void {
    if (surface.bound) return;
    const { trigger, grid } = surface.elements;
    trigger.addEventListener('click', this.#owner.trigger);
    grid.addEventListener('keydown', this.#owner.keydown);
    grid.addEventListener('click', this.#owner.click);
    surface.bound = true;
  }

  #unbind(surface: Surface): void {
    if (!surface.bound) return;
    const { trigger, grid } = surface.elements;
    trigger.removeEventListener('click', this.#owner.trigger);
    grid.removeEventListener('keydown', this.#owner.keydown);
    grid.removeEventListener('click', this.#owner.click);
    surface.bound = false;
  }
}

export function pickerPopupElements(options: Partial<PickerPopupElements>): PickerPopupElements | null {
  const { root, grid, trigger, anchor } = options;
  return root === undefined || grid === undefined || trigger === undefined ? null
    : { root, grid, trigger, ...(anchor === undefined ? {} : { anchor }) };
}

export function calendarFocusEvent(event: string | { readonly type: string }): boolean {
  if (typeof event !== 'string') {
    return event.type === 'select' || event.type === 'select-date' || event.type === 'select-month'
      || event.type === 'select-year' || event.type === 'navigate-period';
  }
  return event.startsWith('next-') || event.startsWith('previous-') || event === 'start-of-week'
    || event === 'end-of-week' || event === 'select-highlighted';
}
