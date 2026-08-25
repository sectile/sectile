import type { LayerDismissReason, LayerMode } from '@sectile/core/layer-stack';
import {
  createDOMLayerID,
  getDOMLayerManager,
  type DOMLayerManager,
} from './layer-manager.js';

export interface DOMLayerBindingOptions {
  readonly surface: HTMLElement;
  readonly owner?: HTMLElement;
  readonly mode?: LayerMode;
  readonly dismissOnEscape?: boolean;
  readonly dismissOnInteractOutside?: boolean;
  readonly readOpen: () => boolean;
  readonly close: (reason: LayerDismissReason | 'ancestor-closed') => void;
}

export interface DOMLayerBinding {
  sync(): void;
  disconnect(): void;
}

const handledDismissals = new WeakSet<object>();

export function createDOMLayerBinding(options: DOMLayerBindingOptions): DOMLayerBinding {
  return new ManagedDOMLayerBinding(options);
}

class ManagedDOMLayerBinding implements DOMLayerBinding {
  readonly #options: DOMLayerBindingOptions;
  readonly #id = createDOMLayerID();
  readonly #manager: DOMLayerManager;
  readonly #keydown: (event: KeyboardEvent) => void;
  readonly #pointerdown: (event: PointerEvent) => void;
  #registered = false;
  #dismissed = false;
  #pendingReason: LayerDismissReason | null = null;

  public constructor(options: DOMLayerBindingOptions) {
    this.#options = options;
    this.#manager = getDOMLayerManager(options.surface);
    this.#keydown = (event): void => {
      if (
        event.key !== 'Escape'
        || options.dismissOnEscape === false
        || handledDismissals.has(event)
      ) return;
      if (this.#dismiss('escape')) {
        handledDismissals.add(event);
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };
    this.#pointerdown = (event): void => {
      if (
        options.dismissOnInteractOutside !== true
        || handledDismissals.has(event)
        || contains(options.surface, event.target)
        || (options.owner !== undefined && contains(options.owner, event.target))
      ) return;
      if (this.#dismiss('interact-outside')) handledDismissals.add(event);
    };
    options.surface.ownerDocument?.addEventListener?.('keydown', this.#keydown, true);
    options.surface.ownerDocument?.addEventListener?.('pointerdown', this.#pointerdown, true);
  }

  public sync(): void {
    const open = this.#options.readOpen();
    if (!open) {
      this.#dismissed = false;
      if (this.#registered) {
        this.#manager.close(this.#id);
        this.#registered = false;
      }
      return;
    }
    if (this.#registered || this.#dismissed) return;
    this.#registered = this.#manager.register({
      id: this.#id,
      surface: this.#options.surface,
      owner: this.#options.owner ?? this.#options.surface,
      layer: {
        id: this.#id,
        mode: this.#options.mode ?? 'non-modal',
        dismissOnEscape: this.#options.dismissOnEscape !== false,
        dismissOnInteractOutside: this.#options.dismissOnInteractOutside === true,
      },
      close: () => {
        this.#registered = false;
        this.#dismissed = true;
        const reason = this.#pendingReason ?? 'ancestor-closed';
        this.#pendingReason = null;
        this.#options.close(reason);
      },
    });
  }

  public disconnect(): void {
    this.#options.surface.ownerDocument?.removeEventListener?.('keydown', this.#keydown, true);
    this.#options.surface.ownerDocument?.removeEventListener?.('pointerdown', this.#pointerdown, true);
    if (this.#registered) this.#manager.close(this.#id);
    this.#registered = false;
  }

  #dismiss(reason: LayerDismissReason): boolean {
    if (!this.#options.readOpen()) return false;
    this.#pendingReason = reason;
    if (this.#manager.dismiss(this.#id, reason)) return true;
    this.#pendingReason = null;
    return false;
  }
}

function contains(root: HTMLElement, target: EventTarget | null): boolean {
  if (target === null) return false;
  try {
    return root === target || root.contains(target as Node);
  } catch {
    return false;
  }
}
