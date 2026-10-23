import type { LayerDismissReason, LayerMode } from '@sectile/core/layer-stack';
import { SectileResultError, type Result } from '@sectile/core/result';
import {
  createDOMLayerID,
  getDOMLayerManager,
  type DOMLayerManager,
  type DOMLayerReparentErrorCode,
  type DOMLayerPresentationListener,
  type DOMLayerPresentationSubscription,
  type LayerHostConnection,
} from './manager.js';
export type { DOMLayerReparentErrorCode, DOMLayerPresentationListener, DOMLayerPresentationSubscription } from './manager.js';

export interface DOMLayerBindingOptions {
  readonly layerHost?: LayerHostConnection | null;
  readonly surface: HTMLElement;
  readonly owner?: HTMLElement;
  readonly mode?: LayerMode;
  readonly dismissOnEscape?: boolean;
  readonly dismissOnInteractOutside?: boolean;
  readonly readOpen: () => boolean;
  readonly close: (reason: LayerDismissReason | 'ancestor-closed') => void;
  /** Opt in only when the owner can release and restore all additional native work. */
  readonly presentation?: { suspend(): void; resume(): void };
}

export interface DOMLayerBinding {
  getActive(): boolean;
  getLayerOrder(): number | null;
  subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription;
  syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode>;
  suspend(): void;
  resume(): void;
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
  #suspended = false;
  #disconnected = false;
  #stopPresentation: (() => void) | undefined;

  public constructor(options: DOMLayerBindingOptions) {
    this.#options = options;
    this.#manager = getDOMLayerManager(options.surface);
    this.#manager.assertWritable();
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
    this.#bind();
  }

  public sync(): void {
    if (this.#disconnected) return;
    this.#manager.assertWritable();
    const open = this.#options.readOpen();
    if (this.#suspended) { if (!open) this.#dismissed = false; return; }
    if (!open) {
      this.#dismissed = false;
      if (this.#registered) {
        this.#manager.close(this.#id);
        this.#registered = false;
      }
      return;
    }
    if (this.#registered || this.#dismissed || this.#options.layerHost === null || this.#options.layerHost?.active === false) return;
    const registered = this.#manager.register({
      id: this.#id,
      surface: this.#options.surface,
      owner: this.#options.owner ?? this.#options.surface,
      ...(this.#options.layerHost === undefined || this.#options.layerHost === null ? {} : { layerHost: this.#options.layerHost }),
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
        if (this.#disconnected && this.#options.presentation !== undefined) return;
        let failed = false, failure: unknown;
        try { this.#options.close(reason); }
        catch (error) { failed = true; failure = error; }
        try { if (this.#options.presentation !== undefined && this.#options.readOpen()) this.#suspendFromLayer(); }
        catch (error) { if (!failed) { failed = true; failure = error; } }
        if (failed) throw failure;
      },
      ...(this.#options.presentation === undefined ? {} : {
        suspend: () => { this.#suspendFromLayer(); },
        requestDismiss: (reason: LayerDismissReason) => {
          let failed = false, failure: unknown;
          try { this.#options.close(reason); }
          catch (error) { failed = true; failure = error; }
          try { if (!this.#options.readOpen() && this.#manager.getOrder(this.#id) !== null) this.#manager.close(this.#id); }
          catch (error) { if (!failed) { failed = true; failure = error; } }
          if (failed) throw failure;
          return true;
        },
      }),
    });
    this.#registered = registered && this.getActive() && this.#manager.getOrder(this.#id) !== null;
  }

  public getActive(): boolean { return !this.#suspended && !this.#disconnected && this.#options.layerHost !== null && this.#options.layerHost?.active !== false; }
  public getLayerOrder(): number | null { return this.#manager.getOrder(this.#id); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription {
    const result = this.#manager.subscribePresentation(this.#id, listener);
    if (result.ok) this.#stopPresentation = result.value;
    return result;
  }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#manager.reparent(this.#id, parent); }

  public suspend(): void {
    this.#manager.assertWritable();
    if (!this.getActive()) return;
    let failed = false, failure: unknown;
    try {
      const result = this.#manager.suspend(this.#id);
      if (!result.ok) throw new SectileResultError(result.error);
    } catch (error) { failed = true; failure = error; }
    if (this.#manager.getOrder(this.#id) === null) {
      try { this.#suspendFromLayer(); } catch (error) { if (!failed) { failed = true; failure = error; } }
    }
    if (failed) throw failure;
  }

  #suspendFromLayer(): void {
    if (this.#suspended) return;
    this.#suspended = true;
    this.#registered = false;
    let failed = false, failure: unknown;
    try { this.#unbind(); } catch (error) { failed = true; failure = error; }
    try { this.#options.presentation?.suspend(); }
    catch (error) { if (!failed) { failed = true; failure = error; } }
    if (failed) throw failure;
  }

  public resume(): void {
    this.#manager.assertWritable();
    if (this.#disconnected || !this.#suspended) return;
    this.#suspended = false;
    this.#dismissed = false;
    try {
      this.sync();
      if (!this.getActive()) return;
      this.#bind();
      this.#options.presentation?.resume();
    } catch (error) {
      try { this.suspend(); } catch { /* Preserve the initiating admission/effect failure. */ }
      throw error;
    }
  }

  public disconnect(): void {
    this.#manager.assertWritable();
    if (this.#disconnected) return;
    this.#disconnected = true;
    this.#stopPresentation?.(); this.#stopPresentation = undefined;
    let failed = false, failure: unknown;
    try { if (this.#registered) this.#manager.close(this.#id); }
    catch (error) { failed = true; failure = error; }
    try { this.#suspendFromLayer(); }
    catch (error) { if (!failed) { failed = true; failure = error; } }
    this.#registered = false;
    if (failed) throw failure;
  }

  #bind(): void {
    this.#options.surface.ownerDocument?.addEventListener?.('keydown', this.#keydown, true);
    this.#options.surface.ownerDocument?.addEventListener?.('pointerdown', this.#pointerdown, true);
  }

  #unbind(): void {
    this.#options.surface.ownerDocument?.removeEventListener?.('keydown', this.#keydown, true);
    this.#options.surface.ownerDocument?.removeEventListener?.('pointerdown', this.#pointerdown, true);
  }

  #dismiss(reason: LayerDismissReason): boolean {
    if (!this.#options.readOpen()) return false;
    this.#pendingReason = reason;
    try { return this.#manager.dismiss(this.#id, reason); }
    finally { this.#pendingReason = null; }
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
