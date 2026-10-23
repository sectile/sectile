import { failResult, okResult, type Result } from '@sectile/core/result';

export type FullscreenOperation = 'enter' | 'exit';
export type FullscreenErrorCode = 'dom.fullscreen-invalid' | 'dom.fullscreen-unavailable' | 'dom.fullscreen-disposed'
  | 'dom.fullscreen-pending' | 'dom.fullscreen-not-owner' | 'dom.fullscreen-failed' | 'dom.fullscreen-reentrant';
export interface FullscreenSnapshot {
  readonly connected: boolean;
  /** Capability/connection admission, not a guarantee of transient activation or native success. */
  readonly available: boolean;
  readonly active: boolean;
  readonly pending: FullscreenOperation | null;
}
export interface FullscreenOptions {
  readonly element: HTMLElement;
  readonly onChange: (snapshot: FullscreenSnapshot) => void;
}
export interface FullscreenConnection {
  getSnapshot(): FullscreenSnapshot;
  refresh(): Result<void, FullscreenErrorCode>;
  /** Invokes the native method before returning, preserving caller activation. */
  enter(): Promise<Result<void, FullscreenErrorCode>>;
  /** Refuses to exit when another element owns fullscreen. */
  exit(): Promise<Result<void, FullscreenErrorCode>>;
  /** Revokes observation/settlement, not native fullscreen or an in-flight browser request. */
  disconnect(): void;
}
type Outcome = Result<void, FullscreenErrorCode>;
interface Ticket { readonly kind: FullscreenOperation; complete: ((success: boolean) => void) | undefined; resolve: ((result: Outcome) => void) | undefined }
const retired: FullscreenSnapshot = /* @__PURE__ */ Object.freeze({ connected: false, available: false, active: false, pending: null });
const failure = (code: FullscreenErrorCode): Result<never, FullscreenErrorCode> => failResult(code === 'dom.fullscreen-invalid' ? 'construction'
  : code === 'dom.fullscreen-pending' || code === 'dom.fullscreen-not-owner' || code === 'dom.fullscreen-reentrant' ? 'transition-rejection' : 'resource-rejection',
code, 'Native fullscreen operation could not be completed');
function createTicket(kind: FullscreenOperation): { readonly ticket: Ticket; readonly promise: Promise<Outcome> } {
  const ticket: Ticket = { kind, complete: undefined, resolve: undefined };
  const promise = new Promise<Outcome>(resolve => { ticket.resolve = resolve; });
  return { ticket, promise };
}
// Native promises retain this revocable port, never a DOM owner or caller options.
function observeNative(promise: Promise<void>, ticket: Ticket): void {
  const deliver = (success: boolean): void => {
    try { ticket.complete?.(success); } catch (error) { queueMicrotask(() => { throw error; }); }
  };
  void promise.then(() => deliver(true), () => deliver(false));
}

export function connectFullscreen(options: FullscreenOptions): Result<FullscreenConnection, FullscreenErrorCode> {
  const element = options?.element;
  if (!element || element.nodeType !== 1 || element.namespaceURI !== 'http://www.w3.org/1999/xhtml'
    || element.localName === 'dialog' || typeof element.getRootNode !== 'function' || typeof element.isConnected !== 'boolean'
    || element.ownerDocument?.nodeType !== 9 || typeof element.ownerDocument.addEventListener !== 'function'
    || typeof element.ownerDocument.removeEventListener !== 'function' || typeof options.onChange !== 'function') return failure('dom.fullscreen-invalid');
  return FullscreenOwner.connect(element, options.onChange);
}
class FullscreenOwner implements FullscreenConnection {
  #element: HTMLElement | undefined;
  #document: Document | undefined;
  #subscriber: FullscreenOptions['onChange'] | undefined;
  #snapshot: FullscreenSnapshot = retired;
  #ticket: Ticket | undefined;
  #listening = 0;
  #busy = false;
  readonly #changed = (): void => { if (!this.#busy && this.#element) this.refresh(); };
  private constructor(element: HTMLElement, subscriber: FullscreenOptions['onChange']) {
    this.#element = element; this.#document = element.ownerDocument; this.#subscriber = subscriber;
  }
  static connect(element: HTMLElement, subscriber: FullscreenOptions['onChange']): Result<FullscreenConnection, FullscreenErrorCode> {
    const owner = new FullscreenOwner(element, subscriber), document = element.ownerDocument;
    try {
      owner.#listening = 1; document.addEventListener('fullscreenchange', owner.#changed);
      owner.#listening = 2; document.addEventListener('fullscreenerror', owner.#changed);
    } catch { owner.disconnect(); return failure('dom.fullscreen-unavailable'); }
    try { const result = owner.refresh(); if (!result.ok) return result; }
    catch (error) { owner.disconnect(); throw error; }
    return okResult(owner);
  }
  getSnapshot(): FullscreenSnapshot { return this.#snapshot; }
  refresh(): Outcome {
    if (!this.#element) return failure('dom.fullscreen-disposed');
    if (this.#busy) return failure('dom.fullscreen-reentrant');
    this.#busy = true;
    try {
      let available: boolean, active: boolean;
      try {
        const element = this.#element, document = this.#document!;
        if (element.ownerDocument !== document) throw new Error('Fullscreen document changed');
        const root = element.getRootNode() as Document | ShadowRoot;
        available = element.isConnected && document.fullscreenEnabled === true && typeof element.requestFullscreen === 'function' && typeof document.exitFullscreen === 'function';
        active = root.fullscreenElement === element;
      } catch {
        const subscriber = this.#subscriber; this.disconnect(); subscriber?.(retired);
        return failure('dom.fullscreen-unavailable');
      }
      this.#publish(available, active);
      return okResult(undefined);
    } finally { this.#busy = false; }
  }
  enter(): Promise<Outcome> { return this.#begin('enter'); }
  exit(): Promise<Outcome> { return this.#begin('exit'); }
  #begin(kind: FullscreenOperation): Promise<Outcome> {
    if (!this.#element) return Promise.resolve(failure('dom.fullscreen-disposed'));
    if (this.#busy) return Promise.resolve(failure('dom.fullscreen-reentrant'));
    if (this.#ticket) return Promise.resolve(failure('dom.fullscreen-pending'));
    const refreshed = this.refresh(); if (!refreshed.ok) return Promise.resolve(refreshed);
    if (!this.#element) return Promise.resolve(failure('dom.fullscreen-disposed'));
    if (kind === 'enter' && this.#snapshot.active) return Promise.resolve(okResult(undefined));
    if (kind === 'exit' && !this.#snapshot.active) return Promise.resolve(failure('dom.fullscreen-not-owner'));
    if (kind === 'exit' && typeof this.#document!.exitFullscreen !== 'function') return Promise.resolve(failure('dom.fullscreen-unavailable'));
    if (kind === 'enter' && !this.#snapshot.available) return Promise.resolve(failure('dom.fullscreen-unavailable'));
    const { ticket, promise } = createTicket(kind);
    ticket.complete = success => this.#finish(ticket, success); this.#ticket = ticket;
    this.#busy = true;
    try { this.#publish(this.#snapshot.available, this.#snapshot.active); }
    finally { this.#busy = false; }
    // A synchronous subscriber may retire this connection before the native effect.
    if (this.#ticket !== ticket) return promise;
    try { observeNative(kind === 'enter' ? this.#element!.requestFullscreen() : this.#document!.exitFullscreen(), ticket); }
    catch { this.#finish(ticket, false); }
    return promise;
  }
  #finish(ticket: Ticket, success: boolean): void {
    if (this.#ticket !== ticket) return;
    const resolve = ticket.resolve; ticket.resolve = undefined; ticket.complete = undefined; this.#ticket = undefined;
    try { this.refresh(); }
    finally { resolve?.(!this.#element ? failure('dom.fullscreen-disposed') : success ? okResult(undefined) : failure('dom.fullscreen-failed')); }
  }
  disconnect(): void {
    const document = this.#document, listening = this.#listening, ticket = this.#ticket;
    this.#element = undefined; this.#document = undefined; this.#subscriber = undefined; this.#ticket = undefined; this.#listening = 0; this.#snapshot = retired;
    if (ticket) { const resolve = ticket.resolve; ticket.resolve = undefined; ticket.complete = undefined; resolve?.(failure('dom.fullscreen-disposed')); }
    if (!document) return;
    try { if (listening >= 1) document.removeEventListener('fullscreenchange', this.#changed); }
    finally { if (listening >= 2) document.removeEventListener('fullscreenerror', this.#changed); }
  }
  #publish(available: boolean, active: boolean): void {
    const pending = this.#ticket?.kind ?? null, old = this.#snapshot;
    if (old.connected && old.available === available && old.active === active && old.pending === pending) return;
    this.#snapshot = Object.freeze({ connected: true, available, active, pending });
    try { this.#subscriber?.(this.#snapshot); } catch (error) { this.disconnect(); throw error; }
  }
}
