import { failResult, okResult, type Result } from '@sectile/core/result';

export type ImageStatus = 'empty' | 'loading' | 'ready' | 'error';
export type ImageErrorCode = 'dom.image-invalid' | 'dom.image-unavailable' | 'dom.image-disposed' | 'dom.image-reentrant';
export interface ImageSnapshot {
  readonly connected: boolean;
  readonly status: ImageStatus;
  readonly currentSrc: string;
  readonly naturalWidth: number;
  readonly naturalHeight: number;
}
export interface ImageOptions {
  readonly element: HTMLImageElement;
  readonly onChange: (snapshot: ImageSnapshot) => void;
}
export interface ImageConnection {
  getSnapshot(): ImageSnapshot;
  /** Revoke old facts before changing a source; native events stay suspended until refresh. */
  invalidate(): Result<void, ImageErrorCode>;
  /** Observe the patched element. An unchanged completed request is not decoded again. */
  refresh(): Result<void, ImageErrorCode>;
  /** Does not mutate attributes, abort native requests, or cancel native decode promises. */
  disconnect(): void;
}

const retired: ImageSnapshot = /* @__PURE__ */ Object.freeze({ connected: false, status: 'empty', currentSrc: '', naturalWidth: 0, naturalHeight: 0 });
const failure = (code: ImageErrorCode, message: string): Result<never, ImageErrorCode> => failResult('construction', code, message);
interface ImageInput {
  readonly src: string; readonly srcset: string; readonly sizes: string;
  readonly crossOrigin: string | null; readonly referrerPolicy: string; readonly currentSrc: string;
}
interface DecodeTicket { complete: ((succeeded: boolean) => void) | undefined }
const readInput = (image: HTMLImageElement): ImageInput => ({
  src: image.src, srcset: image.srcset, sizes: image.sizes,
  crossOrigin: image.crossOrigin, referrerPolicy: image.referrerPolicy, currentSrc: image.currentSrc,
});
const sameInput = (a: ImageInput | undefined, b: ImageInput): boolean => a !== undefined
  && a.src === b.src && a.srcset === b.srcset && a.sizes === b.sizes
  && a.crossOrigin === b.crossOrigin && a.referrerPolicy === b.referrerPolicy && a.currentSrc === b.currentSrc;

// Pending native promises retain only revocable ports, not the image owner.
function observeDecode(promise: Promise<void>, ticket: DecodeTicket): void {
  const deliver = (succeeded: boolean): void => {
    try { ticket.complete?.(succeeded); }
    catch (error) { queueMicrotask(() => { throw error; }); }
  };
  void promise.then(() => deliver(true), () => deliver(false));
}

/** Observe one caller-owned native image, without a second image, fetch, or source cache. */
export function connectImage(options: ImageOptions): Result<ImageConnection, ImageErrorCode> {
  const image = options.element;
  if (!image || image.nodeType !== 1 || image.localName !== 'img'
    || image.namespaceURI !== 'http://www.w3.org/1999/xhtml' || typeof options.onChange !== 'function') {
    return failure('dom.image-invalid', 'Image observation requires an HTML image and subscriber');
  }
  if (typeof image.decode !== 'function') return failure('dom.image-unavailable', 'Native image decoding is unavailable');
  return ImageOwner.connect(image, options.onChange);
}

class ImageOwner implements ImageConnection {
  #element: HTMLImageElement | undefined;
  #subscriber: ImageOptions['onChange'] | undefined;
  #input: ImageInput | undefined;
  #ticket: DecodeTicket | undefined;
  #snapshot: ImageSnapshot = retired;
  #listening = 0;
  #invalidated = false;
  #busy = false;
  readonly #changed = (): void => {
    if (!this.#element || this.#invalidated || this.#busy) return;
    this.#busy = true;
    try { this.#inspect(true); }
    finally { this.#busy = false; }
  };

  private constructor(image: HTMLImageElement, subscriber: ImageOptions['onChange']) {
    this.#element = image; this.#subscriber = subscriber;
  }
  static connect(image: HTMLImageElement, subscriber: ImageOptions['onChange']): Result<ImageConnection, ImageErrorCode> {
    const owner = new ImageOwner(image, subscriber);
    try {
      owner.#listening = 1; image.addEventListener('load', owner.#changed);
      owner.#listening = 2; image.addEventListener('error', owner.#changed);
    } catch {
      owner.disconnect();
      return failure('dom.image-unavailable', 'Native image events could not be observed');
    }
    try { owner.refresh(); }
    catch (error) { owner.disconnect(); throw error; }
    return okResult(owner);
  }
  getSnapshot(): ImageSnapshot { return this.#snapshot; }
  invalidate(): Result<void, ImageErrorCode> {
    if (!this.#element) return failure('dom.image-disposed', 'Image observation is disconnected');
    if (this.#busy) return failure('dom.image-reentrant', 'Image publication cannot be reentered');
    this.#busy = true;
    try {
      this.#invalidated = true; this.#input = undefined; this.#cancelDecode();
      this.#publish('loading', '');
      return okResult(undefined);
    } finally { this.#busy = false; }
  }
  refresh(): Result<void, ImageErrorCode> {
    if (!this.#element) return failure('dom.image-disposed', 'Image observation is disconnected');
    if (this.#busy) return failure('dom.image-reentrant', 'Image publication cannot be reentered');
    this.#busy = true;
    try { this.#invalidated = false; this.#inspect(false); return okResult(undefined); }
    finally { this.#busy = false; }
  }
  disconnect(): void {
    const image = this.#element, listening = this.#listening;
    this.#element = undefined; this.#subscriber = undefined; this.#input = undefined;
    this.#listening = 0; this.#invalidated = true; this.#cancelDecode(); this.#snapshot = retired;
    if (!image) return;
    try { if (listening >= 1) image.removeEventListener('load', this.#changed); }
    finally { if (listening >= 2) image.removeEventListener('error', this.#changed); }
  }
  #cancelDecode(): void {
    if (this.#ticket) this.#ticket.complete = undefined;
    this.#ticket = undefined;
  }
  #inspect(nativeEvent: boolean): void {
    const image = this.#element;
    if (!image) return;
    const input = readInput(image), changed = !sameInput(this.#input, input);
    if (changed) { this.#cancelDecode(); this.#input = input; }
    if (image.complete && !input.src && !input.srcset && !input.currentSrc) {
      this.#cancelDecode(); this.#publish('empty', ''); return;
    }
    if (!image.complete) {
      this.#cancelDecode(); this.#publish('loading', input.currentSrc); return;
    }
    if (this.#ticket || !changed && !nativeEvent && (this.#snapshot.status === 'ready' || this.#snapshot.status === 'error')) return;
    this.#publish('loading', input.currentSrc);
    if (!this.#element) return;
    const ticket: DecodeTicket = { complete: undefined };
    this.#ticket = ticket;
    ticket.complete = (succeeded) => this.#finish(ticket, input, succeeded);
    try { observeDecode(image.decode(), ticket); }
    catch { this.#finish(ticket, input, false); }
  }
  #finish(ticket: DecodeTicket, input: ImageInput, succeeded: boolean): void {
    const image = this.#element;
    if (!image || this.#invalidated || this.#ticket !== ticket) return;
    this.#cancelDecode();
    const wasBusy = this.#busy; this.#busy = true;
    try {
      if (!sameInput(input, readInput(image)) || !image.complete) { this.#inspect(false); return; }
      this.#publish(succeeded ? 'ready' : 'error', input.currentSrc,
        succeeded ? image.naturalWidth : 0, succeeded ? image.naturalHeight : 0);
    } finally { this.#busy = wasBusy; }
  }
  #publish(status: ImageStatus, currentSrc: string, naturalWidth = 0, naturalHeight = 0): void {
    const old = this.#snapshot;
    if (old.connected && old.status === status && old.currentSrc === currentSrc
      && old.naturalWidth === naturalWidth && old.naturalHeight === naturalHeight) return;
    this.#snapshot = Object.freeze({ connected: true, status, currentSrc, naturalWidth, naturalHeight });
    try { this.#subscriber?.(this.#snapshot); }
    catch (error) { this.disconnect(); throw error; }
  }
}
