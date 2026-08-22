import { applyPopoverEvent, createPopoverState, type PopoverCommand, type PopoverEvent, type PopoverState } from '@sectile/core/popover';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
export type PopoverAlign = 'start' | 'center' | 'end';
export interface PopoverOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly side?: PopoverSide;
  readonly align?: PopoverAlign;
  readonly sideOffset?: number;
  readonly collisionPadding?: number;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
}
export interface PopoverConnection extends DOMPopupConnection<PopoverState, PopoverEvent> {
  updatePosition(): void;
}

export function createPopover(options: PopoverOptions): FacadeConnection<PopoverConnection> {
  return unwrap(tryCreatePopover(options));
}

export function tryCreatePopover(options: PopoverOptions): Result<FacadeConnection<PopoverConnection>> {
  return createFacadeConnection(options, (normalized) => tryCreatePopoverConnection(normalized));
}

function tryCreatePopoverConnection(options: PopoverOptions): Result<PopoverConnection> {
  let connection: PositionedPopover | undefined;
  const popup = createDOMPopup<PopoverState, PopoverEvent, PopoverCommand>({
    root: options.root,
    ...(options.trigger === undefined ? {} : { trigger: options.trigger }),
    role: 'dialog',
    modal: false,
    ...(options.label === undefined ? {} : { label: options.label }),
    ...(options.labelledBy === undefined ? {} : { labelledBy: options.labelledBy }),
    ...(options.describedBy === undefined ? {} : { describedBy: options.describedBy }),
    controlled: options.open !== undefined,
    initial: createPopoverState(options.open ?? options.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyPopoverEvent,
    create: createPopoverState,
    read: (state) => state.open,
    interaction: options,
    ...(options.initialFocus === undefined ? {} : { initialFocus: options.initialFocus }),
    autoFocus: options.autoFocus ?? false,
    restoreFocus: options.restoreFocus ?? true,
    trapFocus: options.trapFocus ?? false,
    closeOnInteractOutside: options.closeOnInteractOutside ?? true,
    onOpenChange: options.onOpenChange,
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: () => { connection?.updatePosition(); options.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedPopover(popup.value, options);
  connection.updatePosition();
  return { ok: true, value: connection };
}

class PositionedPopover implements PopoverConnection {
  readonly #popup: DOMPopupConnection<PopoverState, PopoverEvent>;
  readonly #options: PopoverOptions;
  readonly #reposition: () => void;

  public constructor(popup: DOMPopupConnection<PopoverState, PopoverEvent>, options: PopoverOptions) {
    this.#popup = popup;
    this.#options = options;
    this.#reposition = (): void => this.updatePosition();
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.#reposition);
      window.addEventListener('scroll', this.#reposition, true);
    }
  }
  public getSnapshot() { return this.#popup.getSnapshot(); }
  public syncControlledValue(open: boolean) { return this.#popup.syncControlledValue(open); }
  public handleEvent(event: PopoverEvent): boolean { return this.#popup.handleEvent(event); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public disconnect(): void {
    this.#popup.disconnect();
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.#reposition);
      window.removeEventListener('scroll', this.#reposition, true);
    }
  }
  public updatePosition(): void {
    if (this.#options.root.hidden) return;
    const anchor = this.#options.anchor ?? this.#options.trigger;
    if (anchor === undefined || typeof anchor.getBoundingClientRect !== 'function' || typeof window === 'undefined') return;
    const root = this.#options.root;
    const anchorRect = anchor.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    const padding = this.#options.collisionPadding ?? 8;
    const offset = this.#options.sideOffset ?? 8;
    const preferred = this.#options.side ?? 'bottom';
    const side = chooseSide(preferred, anchorRect, rootRect, offset, padding);
    const align = this.#options.align ?? 'center';
    const point = place(side, align, anchorRect, rootRect, offset);
    const left = clamp(point.left, padding, Math.max(padding, window.innerWidth - rootRect.width - padding));
    const top = clamp(point.top, padding, Math.max(padding, window.innerHeight - rootRect.height - padding));
    root.style.position = 'fixed';
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.dataset['side'] = side;
    root.dataset['align'] = align;
    if (this.#options.arrow !== undefined) this.#options.arrow.dataset['side'] = side;
  }
}

function chooseSide(preferred: PopoverSide, anchor: DOMRect, content: DOMRect, offset: number, padding: number): PopoverSide {
  const available = {
    top: anchor.top - padding,
    right: window.innerWidth - anchor.right - padding,
    bottom: window.innerHeight - anchor.bottom - padding,
    left: anchor.left - padding,
  };
  const required = preferred === 'top' || preferred === 'bottom' ? content.height + offset : content.width + offset;
  if (available[preferred] >= required) return preferred;
  const opposite: Record<PopoverSide, PopoverSide> = { top: 'bottom', right: 'left', bottom: 'top', left: 'right' };
  const fallback = opposite[preferred];
  return available[fallback] > available[preferred] ? fallback : preferred;
}

function place(side: PopoverSide, align: PopoverAlign, anchor: DOMRect, content: DOMRect, offset: number): { left: number; top: number } {
  const crossX = align === 'start' ? anchor.left : align === 'end' ? anchor.right - content.width : anchor.left + (anchor.width - content.width) / 2;
  const crossY = align === 'start' ? anchor.top : align === 'end' ? anchor.bottom - content.height : anchor.top + (anchor.height - content.height) / 2;
  if (side === 'top') return { left: crossX, top: anchor.top - content.height - offset };
  if (side === 'bottom') return { left: crossX, top: anchor.bottom + offset };
  if (side === 'left') return { left: anchor.left - content.width - offset, top: crossY };
  return { left: anchor.right + offset, top: crossY };
}

function clamp(value: number, minimum: number, maximum: number): number { return Math.min(maximum, Math.max(minimum, value)); }
