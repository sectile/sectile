import { failResult, okResult, type Result } from '@sectile/core/result';
import { timeMs } from './overlay/presence/motion.js';

export type LayoutMotionErrorCode = 'dom.layout-motion-invalid' | 'dom.layout-motion-unavailable';
export interface LayoutMotionOptions {
  readonly element: HTMLElement;
  /** Direct flow children in an unscaled, axis-aligned coordinate space.
   * Individual translate is reserved for this connection; translation transforms remain independent. */
  readonly itemClass: string;
  readonly durationProperty: `--${string}`;
  readonly easingProperty: `--${string}`;
  readonly enabledProperty: `--${string}`;
}
export interface LayoutMotionConnection {
  /** Coalesce an accepted CSS policy or flow-alignment change with native size/list changes. */
  refresh(): void;
  disconnect(): void;
}
interface Item {
  x: number; y: number; nextX: number; nextY: number;
  offsetX: number; offsetY: number; seen: number;
  animation: Animation | undefined;
  duration: number; easing: string; revision: number;
}
const property = (value: unknown): value is `--${string}` => typeof value === 'string' && value.length <= 128 && /^--[-_a-zA-Z0-9]+$/u.test(value);

/** Event-driven native flow observation; no queue, frame evaluator or resources at module import. */
export function connectLayoutMotion(options: LayoutMotionOptions): Result<LayoutMotionConnection, LayoutMotionErrorCode> {
  const { element, itemClass, durationProperty, easingProperty, enabledProperty } = options;
  if (!element || element.nodeType !== 1 || typeof itemClass !== 'string' || !/^[-_a-zA-Z][-_a-zA-Z0-9]*$/u.test(itemClass)
    || !property(durationProperty) || !property(easingProperty) || !property(enabledProperty)) {
    return failResult('construction', 'dom.layout-motion-invalid', 'Layout motion requires a host, direct-child class and three CSS policy properties');
  }
  const connection = new LayoutMotionController(element, itemClass, durationProperty, easingProperty, enabledProperty);
  if (!connection.connect()) {
    connection.disconnect();
    return failResult('construction', 'dom.layout-motion-unavailable', 'Native layout observation is unavailable');
  }
  return okResult(connection);
}

class LayoutMotionController implements LayoutMotionConnection {
  #element: HTMLElement | undefined;
  #view: (Window & typeof globalThis) | undefined;
  #resize: ResizeObserver | undefined;
  #mutation: MutationObserver | undefined;
  #media: MediaQueryList | undefined;
  #frame: number | undefined;
  #generation = 0;
  #items = new Map<HTMLElement, Item>();
  readonly #itemClass: string;
  readonly #durationProperty: string;
  readonly #easingProperty: string;
  readonly #enabledProperty: string;
  readonly #invalidate = (): void => { this.refresh(); };
  readonly #preference = (): void => {
    if (this.#media?.matches) for (const item of this.#items.values()) this.#stop(item);
    this.refresh();
  };

  constructor(element: HTMLElement, itemClass: string, duration: string, easing: string, enabled: string) {
    this.#element = element;
    this.#view = element.ownerDocument.defaultView ?? undefined;
    this.#itemClass = itemClass; this.#durationProperty = duration;
    this.#easingProperty = easing; this.#enabledProperty = enabled;
  }

  connect(): boolean {
    const element = this.#element, view = this.#view;
    if (!element || !view || typeof view.ResizeObserver !== 'function' || typeof view.MutationObserver !== 'function'
      || typeof view.requestAnimationFrame !== 'function' || typeof view.cancelAnimationFrame !== 'function') return false;
    try {
      this.#resize = new view.ResizeObserver(this.#invalidate);
      this.#mutation = new view.MutationObserver(this.#invalidate);
      this.#resize.observe(element, { box: 'border-box' });
      this.#mutation.observe(element, { childList: true });
      if (typeof view.matchMedia === 'function') {
        this.#media = view.matchMedia('(prefers-reduced-motion: reduce)');
        this.#media.addEventListener('change', this.#preference);
      }
      this.#measure();
      return true;
    } catch { return false; }
  }

  refresh(): void {
    if (!this.#element || !this.#view || this.#frame !== undefined) return;
    this.#frame = this.#view.requestAnimationFrame(() => {
      this.#frame = undefined;
      if (this.#element) this.#measure();
    });
  }

  #stop(item: Item): void {
    const animation = item.animation;
    item.revision++;
    item.animation = undefined; item.offsetX = 0; item.offsetY = 0;
    if (!animation) return;
    animation.onfinish = null; animation.oncancel = null;
    try { animation.cancel(); } finally { animation.effect = null; }
  }

  #offset(item: Item): number {
    const animation = item.animation;
    if (!animation || animation.playState === 'finished' || animation.playState === 'idle') return 0;
    // Native progress already includes easing (including intentional overshoot).
    const progress = animation.effect?.getComputedTiming().progress;
    return progress === null || progress === undefined ? 1 : 1 - progress;
  }

  #measure(): void {
    const root = this.#element, view = this.#view;
    if (!root || !view) return;
    try {
      const style = view.getComputedStyle(root);
      const parsed = timeMs(style.getPropertyValue(this.#durationProperty));
      const duration = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
      const easing = style.getPropertyValue(this.#easingProperty).trim();
      const enabled = !this.#media?.matches && duration > 0 && easing.length > 0 && style.getPropertyValue(this.#enabledProperty).trim() === '1';
      const generation = ++this.#generation, origin = root.getBoundingClientRect();
      // Freeze owned timelines before reading presentation boxes; replace effects only after all reads.
      for (const item of this.#items.values()) if (item.animation?.playState === 'running') item.animation.pause();
      for (const child of root.children) {
        if (!child.classList.contains(this.#itemClass) || !(child instanceof view.HTMLElement)) continue;
        let item = this.#items.get(child);
        const fraction = item ? this.#offset(item) : 0;
        const rect = child.getBoundingClientRect(), childStyle = view.getComputedStyle(child);
        let transformX = 0, transformY = 0;
        if (childStyle.transform && childStyle.transform !== 'none') {
          const matrix = new view.DOMMatrixReadOnly(childStyle.transform);
          if (!matrix.is2D || matrix.a !== 1 || matrix.b !== 0 || matrix.c !== 0 || matrix.d !== 1) continue;
          transformX = matrix.e; transformY = matrix.f;
        }
        const x = rect.left - origin.left + root.scrollLeft - transformX - (item?.offsetX ?? 0) * fraction;
        const y = rect.top - origin.top + root.scrollTop - transformY - (item?.offsetY ?? 0) * fraction;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!item) {
          item = { x, y, nextX: x, nextY: y, offsetX: 0, offsetY: 0, seen: generation, animation: undefined, duration: 0, easing: '', revision: 0 };
          this.#items.set(child, item);
          this.#resize?.observe(child, { box: 'border-box' });
        }
        item.seen = generation; item.nextX = x; item.nextY = y;
      }
      for (const [element, item] of this.#items) {
        if (item.seen !== generation) {
          this.#stop(item); this.#resize?.unobserve(element); this.#items.delete(element);
          continue;
        }
        const changed = item.x !== item.nextX || item.y !== item.nextY;
        if (!enabled || typeof element.animate !== 'function') {
          this.#stop(item); item.x = item.nextX; item.y = item.nextY;
          continue;
        }
        if (!changed && item.duration === duration && item.easing === easing) {
          if (item.animation?.playState === 'paused') item.animation.play();
          continue;
        }
        const fraction = this.#offset(item);
        const x = item.x + item.offsetX * fraction - item.nextX;
        const y = item.y + item.offsetY * fraction - item.nextY;
        this.#stop(item); item.x = item.nextX; item.y = item.nextY;
        item.duration = duration; item.easing = easing;
        if (x === 0 && y === 0) continue;
        item.offsetX = x; item.offsetY = y;
        try {
          item.animation = element.animate([{ translate: `${x}px ${y}px` }, { translate: '0px 0px' }], { duration, easing });
          // The callback captures only the clearable lease, never an element or construction options.
          const revision = item.revision;
          const settle = (): void => { if (item.revision === revision) this.#stop(item); };
          item.animation.onfinish = settle; item.animation.oncancel = settle;
        } catch { this.#stop(item); }
      }
    } catch {
      // Unavailable layout facts must not leave an owned effect frozen between endpoints.
      for (const item of this.#items.values()) this.#stop(item);
    }
  }

  disconnect(): void {
    const view = this.#view, frame = this.#frame, resize = this.#resize, mutation = this.#mutation, media = this.#media;
    this.#element = undefined; this.#view = undefined; this.#frame = undefined;
    this.#resize = undefined; this.#mutation = undefined; this.#media = undefined;
    try { if (frame !== undefined) view?.cancelAnimationFrame(frame); }
    finally {
      try { resize?.disconnect(); }
      finally {
        try { mutation?.disconnect(); }
        finally {
          try { media?.removeEventListener('change', this.#preference); }
          finally {
            for (const item of this.#items.values()) { try { this.#stop(item); } catch { /* Continue releasing other native effects. */ } }
            this.#items.clear();
          }
        }
      }
    }
  }
}
