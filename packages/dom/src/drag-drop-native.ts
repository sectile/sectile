import { failResult, okResult, type Result, type SectileError } from '@sectile/core/result';
import { createDOMAttributeBinding, type DOMAttributeBinding } from './interaction/attributes.js';
import { eventOrigin, gestureParent, protectsNativeInteraction } from './interaction/gesture.js';
import type { DataTransferErrorCode, DataTransferFormat } from './drag-drop.js';

export type DataTransferOperation = 'copy' | 'move';
export interface DataTransferSnapshot {
  readonly connected: boolean;
  readonly active: boolean;
  readonly operation: DataTransferOperation | null;
}
interface NativeTransferOptions<Value> {
  readonly element: HTMLElement;
  readonly format: DataTransferFormat<Value>;
  /** One or two distinct operations, in target preference order. */
  readonly operations: readonly DataTransferOperation[];
  readonly onChange?: (snapshot: DataTransferSnapshot) => void;
  readonly onReject?: (error: SectileError<DataTransferErrorCode>) => void;
}
export interface DragSourceOptions<Value> extends NativeTransferOptions<Value> {
  readonly getValue: NoInfer<(this: void) => Value>;
  /** Native drag result only; never authorization to delete application data. */
  readonly onEnd?: (operation: DataTransferOperation | null) => void;
}
export type DataTransferCommit<Value> = (this: void, value: Value) => Result<void, string>;
export interface DataTransferRequest<Value> {
  readonly operation: DataTransferOperation;
  readonly source: 'drop' | 'paste';
  /** Retired on success as well as rejection/cancellation. */
  readonly signal: AbortSignal;
  getValue(): Result<Value, DataTransferErrorCode>;
  /** Stage one synchronous atomic commit; this call itself transfers no ownership. */
  accept(commit: DataTransferCommit<NoInfer<Value>>): boolean;
  reject(): void;
}
export interface DropTargetOptions<Value> extends NativeTransferOptions<Value> {
  /** Reject native metadata lists above this ceiling before scanning or decoding. */
  readonly maxTypes: number;
  readonly onDrop: (this: void, request: DataTransferRequest<Value>) => undefined;
}
export interface DataTransferConnection {
  getSnapshot(): DataTransferSnapshot;
  /** Revoke local staging; exposed native bytes cannot be recalled. */
  cancel(): void;
  disconnect(): void;
}
type Outcome = Result<void, DataTransferErrorCode>;
type CanonicalFormat = (format: unknown) => boolean;
const retired: DataTransferSnapshot = /* @__PURE__ */ Object.freeze({ connected: false, active: false, operation: null });
const failure = (code: DataTransferErrorCode): Result<never, DataTransferErrorCode> => failResult(
  code === 'dom.data-transfer-native-invalid' ? 'construction'
    : code === 'dom.data-transfer-unavailable' ? 'resource-rejection' : 'transition-rejection',
  code, 'The native transfer operation did not complete');
function ignoreRejection(): void { /* Unsupported asynchronous work has no settlement owner. */ }
export function isAsyncTransferValue(value: unknown): boolean {
  if (value === null || typeof value !== 'object' && typeof value !== 'function') return false;
  if (typeof (value as { readonly then?: unknown }).then !== 'function') return false;
  void Promise.resolve(value).catch(ignoreRejection);
  return true;
}
function operations(value: readonly DataTransferOperation[]): readonly DataTransferOperation[] | undefined {
  if (!Array.isArray(value) || value.length < 1 || value.length > 2) return;
  const first: unknown = value[0], second: unknown = value[1];
  if (first !== 'copy' && first !== 'move' || value.length === 2 && (second !== 'copy' && second !== 'move' || second === first)) return;
  return value.length === 1 ? [first] : [first, second as DataTransferOperation];
}
function available(element: HTMLElement): boolean {
  return element.isConnected && element.ownerDocument.defaultView?.closed === false;
}
function valid<Value>(options: NativeTransferOptions<Value>, canonical: CanonicalFormat): boolean {
  const element = options?.element, document = element?.ownerDocument, view = document?.defaultView;
  return !!element && element.nodeType === 1 && element.namespaceURI === 'http://www.w3.org/1999/xhtml'
    && document?.nodeType === 9 && !!view && typeof element.addEventListener === 'function'
    && typeof element.removeEventListener === 'function' && typeof document.addEventListener === 'function'
    && typeof document.removeEventListener === 'function' && typeof view.addEventListener === 'function'
    && typeof view.removeEventListener === 'function' && canonical(options.format)
    && (options.onChange === undefined || typeof options.onChange === 'function')
    && (options.onReject === undefined || typeof options.onReject === 'function');
}
function eligible(event: Event, element: HTMLElement, exact = false): boolean {
  if (event.defaultPrevented || !event.cancelable || !available(element)) return false;
  const origin = eventOrigin(event);
  if (!origin || !element.contains(origin) || exact && origin !== element
    || element.matches('input,textarea,select,[contenteditable]:not([contenteditable="false"])')) return false;
  if (origin !== element && protectsNativeInteraction(origin, element)) return false;
  for (let node: Element | null = origin; node && node !== element; node = gestureParent(node)) {
    if ((node as HTMLElement).draggable === true) return false;
  }
  return true;
}
function allowed(store: DataTransfer, operation: DataTransferOperation): boolean {
  const effects = store.effectAllowed;
  return effects === 'all' || effects === 'uninitialized' || effects === 'copyMove'
    || effects === operation || effects === (operation === 'copy' ? 'copyLink' : 'linkMove');
}
function negotiate(store: DataTransfer, choices: readonly DataTransferOperation[]): DataTransferOperation | null {
  const preferred = store.dropEffect;
  if ((preferred === 'copy' || preferred === 'move') && choices.includes(preferred) && allowed(store, preferred)) return preferred;
  for (const choice of choices) if (allowed(store, choice)) return choice;
  return null;
}

/** A saved request captures only this revocable port, never its native connection. */
class RequestPort<Value> implements DataTransferRequest<Value> {
  readonly operation: DataTransferOperation;
  readonly source: 'drop' | 'paste';
  readonly #abort = new AbortController();
  #value: Value | undefined;
  #commit: DataTransferCommit<Value> | undefined;
  #phase: 'open' | 'committing' | 'closed' = 'open';
  constructor(value: Value, operation: DataTransferOperation, source: 'drop' | 'paste') {
    this.#value = value; this.operation = operation; this.source = source;
  }
  get signal(): AbortSignal { return this.#abort.signal; }
  getValue(): Result<Value, DataTransferErrorCode> {
    return this.#phase === 'open' ? okResult(this.#value as Value) : failure('dom.data-transfer-inactive');
  }
  accept(commit: DataTransferCommit<Value>): boolean {
    if (this.#phase !== 'open' || this.#commit || typeof commit !== 'function') return false;
    this.#commit = commit; return true;
  }
  reject(): void { this.close('cancelled'); }
  get ready(): boolean { return this.#phase === 'open' && this.#commit !== undefined; }
  close(reason: string): void {
    if (this.#phase !== 'open') return;
    this.#phase = 'closed'; this.#value = undefined; this.#commit = undefined;
    this.#abort.abort(reason);
  }
  apply(): Outcome {
    if (!this.ready) return failure('dom.data-transfer-inactive');
    const commit = this.#commit!, value = this.#value as Value;
    this.#phase = 'committing'; this.#commit = undefined; this.#value = undefined;
    let success = false;
    try {
      const outcome: unknown = commit(value);
      if (isAsyncTransferValue(outcome) || !outcome || typeof outcome !== 'object') return failure('dom.data-transfer-commit-failed');
      const ok = Object.getOwnPropertyDescriptor(outcome, 'ok');
      const result = Object.getOwnPropertyDescriptor(outcome, 'value');
      success = ok?.value === true && result !== undefined && 'value' in result && result.value === undefined;
      return success ? okResult(undefined) : failure('dom.data-transfer-commit-failed');
    } catch { return failure('dom.data-transfer-commit-failed'); }
    finally { this.#phase = 'closed'; this.#abort.abort(success ? 'completed' : 'failed'); }
  }
}

function requestView<Value>(port: RequestPort<Value>): DataTransferRequest<Value> {
  return Object.freeze({ operation: port.operation, source: port.source, signal: port.signal,
    getValue: () => port.getValue(), accept: (commit: DataTransferCommit<Value>) => port.accept(commit), reject: () => port.reject() });
}

abstract class NativeOwner<Value> implements DataTransferConnection {
  protected element: HTMLElement | undefined;
  protected format: DataTransferFormat<Value> | undefined;
  protected choices: readonly DataTransferOperation[];
  protected generation = 0;
  protected busy = false;
  #change: NativeTransferOptions<Value>['onChange'] | undefined;
  #reject: NativeTransferOptions<Value>['onReject'] | undefined;
  #document: Document | undefined;
  #snapshot: DataTransferSnapshot = Object.freeze({ connected: true, active: false, operation: null });
  #listeners: [EventTarget, string, EventListener][] = [];
  protected constructor(options: NativeTransferOptions<Value>, choices: readonly DataTransferOperation[]) {
    this.element = options.element; this.format = options.format; this.choices = choices;
    this.#document = options.element.ownerDocument;
    this.#change = options.onChange; this.#reject = options.onReject;
  }
  protected listen(target: EventTarget, type: string, handler: EventListener): void {
    this.#listeners.push([target, type, handler]); target.addEventListener(type, handler);
  }
  protected publish(active: boolean, operation: DataTransferOperation | null): void {
    if (!this.element || this.#snapshot.active === active && this.#snapshot.operation === operation) return;
    this.#snapshot = Object.freeze({ connected: true, active, operation }); this.#change?.(this.#snapshot);
  }
  protected reject(result: Result<unknown, DataTransferErrorCode>): void { if (!result.ok) this.#reject?.(result.error); }
  protected current(generation: number): boolean {
    if (!this.element || this.generation !== generation) return false;
    if (this.element.ownerDocument !== this.#document) { this.disconnect(); return false; }
    return available(this.element);
  }
  getSnapshot(): DataTransferSnapshot { return this.#snapshot; }
  abstract cancel(): void;
  protected abstract release(): void;
  disconnect(): void {
    if (!this.element) return;
    this.generation++; this.element = undefined; this.format = undefined; this.#document = undefined; this.choices = [];
    const notify = this.#change; this.#change = undefined; this.#reject = undefined; this.#snapshot = retired;
    let failed = false, first: unknown;
    const attempt = (action: () => void): void => { try { action(); } catch (error) { if (!failed) { failed = true; first = error; } } };
    attempt(() => this.release());
    for (const [target, type, handler] of this.#listeners.splice(0)) attempt(() => target.removeEventListener(type, handler));
    attempt(() => notify?.(retired));
    if (failed) throw first;
  }
}

class DragSourceOwner<Value> extends NativeOwner<Value> {
  #getValue: DragSourceOptions<Value>['getValue'] | undefined;
  #end: DragSourceOptions<Value>['onEnd'] | undefined;
  #attributes: DOMAttributeBinding | undefined;
  #dragging = false;
  readonly #start = (event: Event): void => { this.#write(event as DragEvent, false); };
  readonly #copy = (event: Event): void => { this.#write(event as ClipboardEvent, true); };
  readonly #ended = (native: Event): void => {
    if (!this.#dragging || this.busy || !this.current(this.generation)) return;
    let operation: DataTransferOperation | null = null;
    try { const effect = (native as DragEvent).dataTransfer?.dropEffect; if ((effect === 'copy' || effect === 'move') && this.choices.includes(effect)) operation = effect; }
    finally { this.#dragging = false; this.generation++; this.publish(false, null); }
    this.#end?.(operation);
  };
  constructor(options: DragSourceOptions<Value>, choices: readonly DataTransferOperation[]) {
    super(options, choices); this.#getValue = options.getValue; this.#end = options.onEnd;
  }
  connect(): void {
    const element = this.element!;
    this.#attributes = createDOMAttributeBinding(element); this.#attributes.apply({ draggable: 'true' });
    this.listen(element, 'dragstart', this.#start); this.listen(element, 'dragend', this.#ended); this.listen(element, 'copy', this.#copy);
  }
  #write(event: DragEvent | ClipboardEvent, copy: boolean): void {
    const element = this.element;
    if (this.busy || !element || !this.current(this.generation) || !eligible(event, element, copy) || copy && !this.choices.includes('copy')) return;
    if (copy && element.ownerDocument.getSelection()?.isCollapsed === false) return;
    const generation = this.generation, format = this.format!, getValue = this.#getValue!;
    const store = copy ? (event as ClipboardEvent).clipboardData : (event as DragEvent).dataTransfer;
    this.busy = true;
    try {
      if (!store) { event.preventDefault(); this.reject(failure('dom.data-transfer-unavailable')); return; }
      const value = getValue(); if (!this.current(generation)) { event.preventDefault(); return; }
      const encoded = format.write(value);
      if (!this.current(generation)) { event.preventDefault(); return; }
      if (!encoded.ok) { event.preventDefault(); this.reject(encoded); return; }
      if (!copy) {
        const effect = this.choices.length === 2 ? 'copyMove' : this.choices[0]!;
        store.effectAllowed = effect;
        if (store.effectAllowed !== effect) throw new Error('Native effect admission failed');
      }
      if (!this.current(generation)) { event.preventDefault(); return; }
      store.setData(encoded.value.type, encoded.value.data);
      if (!copy) { this.#dragging = true; this.publish(true, null); }
      if (!this.current(generation)) { store.clearData(encoded.value.type); event.preventDefault(); return; }
      if (copy) event.preventDefault();
    } catch {
      try { store?.clearData(format.type); } catch { /* Cancel the native operation even when clearing is unavailable. */ }
      event.preventDefault(); this.#dragging = false; this.publish(false, null); this.reject(failure('dom.data-transfer-provider-failed'));
    }
    finally { this.busy = false; }
  }
  cancel(): void { this.generation++; const active = this.#dragging; this.#dragging = false; this.publish(false, null); if (active) this.#end?.(null); }
  protected release(): void {
    this.#getValue = undefined; this.#end = undefined; this.#dragging = false;
    const attributes = this.#attributes; this.#attributes = undefined; attributes?.disconnect();
  }
}

class DropTargetOwner<Value> extends NativeOwner<Value> {
  #drop: DropTargetOptions<Value>['onDrop'] | undefined;
  readonly #maxTypes: number;
  #request: RequestPort<Value> | undefined;
  readonly #over = (event: Event): void => { this.#handle(event as DragEvent, 'hover'); };
  readonly #dropEvent = (event: Event): void => { this.#handle(event as DragEvent, 'drop'); };
  readonly #paste = (event: Event): void => { this.#handle(event as ClipboardEvent, 'paste'); };
  readonly #leave = (event: Event): void => {
    const next = (event as DragEvent).relatedTarget as Node | null;
    try { if (next && this.element?.contains(next)) return; } catch { /* A non-Node related target is outside this surface. */ }
    this.cancel();
  };
  readonly #cancel = (): void => { this.cancel(); };
  readonly #visibility = (): void => { if (this.element?.ownerDocument.hidden) this.cancel(); };
  constructor(options: DropTargetOptions<Value>, choices: readonly DataTransferOperation[]) {
    super(options, choices); this.#drop = options.onDrop; this.#maxTypes = options.maxTypes;
  }
  connect(): void {
    const element = this.element!, document = element.ownerDocument;
    this.listen(element, 'dragenter', this.#over); this.listen(element, 'dragover', this.#over);
    this.listen(element, 'dragleave', this.#leave); this.listen(element, 'drop', this.#dropEvent); this.listen(element, 'paste', this.#paste);
    this.listen(document, 'dragend', this.#cancel); this.listen(document, 'visibilitychange', this.#visibility);
    this.listen(document.defaultView!, 'blur', this.#cancel);
  }
  #handle(event: DragEvent | ClipboardEvent, kind: 'hover' | 'drop' | 'paste'): void {
    const element = this.element;
    if (this.busy || !element || !this.current(this.generation)) return;
    // Native paste may target the non-editable selection anchor inside a focused
    // surface. The shared admission walk still protects editable/interactive children.
    if (!eligible(event, element)) { if (kind === 'hover') this.publish(false, null); return; }
    const store = kind === 'paste' ? (event as ClipboardEvent).clipboardData : (event as DragEvent).dataTransfer;
    const generation = this.generation, format = this.format!;
    this.busy = true;
    let request: RequestPort<Value> | undefined;
    let hovering = false;
    let committed = false;
    let owned = false;
    try {
      if (!store) return;
      const types = store.types;
      if (!types || !Number.isSafeInteger(types.length) || types.length > this.#maxTypes || types.length < 1) {
        if (kind !== 'hover') this.reject(failure('dom.data-transfer-type-rejected')); return;
      }
      let match = false;
      for (let index = 0; index < types.length; index++) { const type = types[index]; if (type === 'Files') return; if (type === format.type) match = true; }
      if (!match) return;
      owned = true;
      const operation = kind === 'paste' ? this.choices.includes('copy') ? 'copy' : null : negotiate(store, this.choices);
      if (!operation) { if (kind !== 'hover') this.reject(failure('dom.data-transfer-operation-rejected')); return; }
      if (kind === 'hover') {
        store.dropEffect = operation; event.preventDefault();
        if (this.current(generation)) { hovering = true; this.publish(true, operation); }
        return;
      }
      // An owned matching format must not fall through into native HTML/text insertion on rejection.
      event.preventDefault();
      if (kind === 'drop') store.dropEffect = 'none';
      const decoded = format.read({ type: format.type, data: store.getData(format.type) });
      if (!this.current(generation)) return;
      if (!decoded.ok) { this.reject(decoded); return; }
      request = new RequestPort(decoded.value, operation, kind); this.#request = request;
      const drop = this.#drop!, outcome: unknown = drop(requestView(request));
      if (isAsyncTransferValue(outcome) || outcome !== undefined) { this.reject(failure('dom.data-transfer-provider-failed')); return; }
      if (!this.current(generation) || this.#request !== request || !request.ready) return;
      if (kind === 'drop') { store.dropEffect = operation; if (store.dropEffect !== operation) throw new Error('Native acknowledgement unavailable'); }
      if (!this.current(generation) || this.#request !== request || !request.ready) return;
      const result = request.apply();
      committed = result.ok;
      if (!result.ok) { if (kind === 'drop') store.dropEffect = 'none'; this.reject(result); }
    } catch {
      if (owned && store && kind === 'drop') { try { store.dropEffect = 'none'; } catch { /* Native acknowledgement remains unavailable. */ } }
      this.reject(failure('dom.data-transfer-provider-failed'));
    } finally {
      if (owned && store && kind === 'drop' && !committed) { try { store.dropEffect = 'none'; } catch { /* Native rejection is best effort. */ } }
      request?.close('cancelled'); if (this.#request === request) this.#request = undefined;
      this.busy = false; if (!hovering) this.publish(false, null);
    }
  }
  cancel(): void {
    this.generation++; const request = this.#request; this.#request = undefined;
    request?.close('cancelled'); this.publish(false, null);
  }
  protected release(): void { this.#drop = undefined; const request = this.#request; this.#request = undefined; request?.close('cancelled'); }
}

export function connectNativeDragSource<Value>(options: DragSourceOptions<Value>, canonical: CanonicalFormat): Result<DataTransferConnection, DataTransferErrorCode> {
  let owner: DragSourceOwner<Value> | undefined;
  try {
    if (!valid(options, canonical) || typeof options.getValue !== 'function' || options.onEnd !== undefined && typeof options.onEnd !== 'function') return failure('dom.data-transfer-native-invalid');
    const choices = operations(options.operations); if (!choices) return failure('dom.data-transfer-native-invalid');
    owner = new DragSourceOwner(options, choices); owner.connect(); return okResult(owner);
  } catch { owner?.disconnect(); return failure('dom.data-transfer-unavailable'); }
}
export function connectNativeDropTarget<Value>(options: DropTargetOptions<Value>, canonical: CanonicalFormat): Result<DataTransferConnection, DataTransferErrorCode> {
  let owner: DropTargetOwner<Value> | undefined;
  try {
    if (!valid(options, canonical) || typeof options.onDrop !== 'function' || !Number.isSafeInteger(options.maxTypes) || options.maxTypes < 1) return failure('dom.data-transfer-native-invalid');
    const choices = operations(options.operations); if (!choices) return failure('dom.data-transfer-native-invalid');
    owner = new DropTargetOwner(options, choices); owner.connect(); return okResult(owner);
  } catch { owner?.disconnect(); return failure('dom.data-transfer-unavailable'); }
}
