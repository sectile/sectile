import { alignRect, clampRect, insetRect, intersectRects, outsetRect, type Rect } from '@sectile/core/geometry';
import { failResult, okResult, type Result } from '@sectile/core/result';
import { readViewportRect } from './internal/viewport.js';
import { hasPositiveAxisAlignedTransform } from './interaction/gesture.js';

export interface FocusVisibilityOptions {
  readonly element: HTMLElement;
  /** Permit the document scroll owner when no local scrollport is available. */
  readonly documentScroll?: boolean;
  /** Current same-document logical focus root, such as a Portal. Its scroll effects stay local. */
  readonly getFocusRoot?: () => HTMLElement | undefined;
}
export interface FocusVisibilityConnection { refresh(): void; disconnect(): void }
export type FocusVisibilityErrorCode = 'dom.focus-visibility-invalid' | 'dom.focus-visibility-unavailable';

/** Scoped, event-driven visibility effects. Native focus and selection stay untouched. */
export function connectFocusVisibility(options: FocusVisibilityOptions): Result<FocusVisibilityConnection, FocusVisibilityErrorCode> {
  if (!options.element || options.element.nodeType !== 1 || options.documentScroll !== undefined && typeof options.documentScroll !== 'boolean'
    || options.getFocusRoot !== undefined && typeof options.getFocusRoot !== 'function') {
    return failResult('construction', 'dom.focus-visibility-invalid', 'Focus visibility requires an element and an optional document-scroll admission');
  }
  const owner = new FocusVisibilityOwner(options.element, options.documentScroll === true, options.getFocusRoot);
  if (!owner.connect()) {
    owner.disconnect();
    return failResult('construction', 'dom.focus-visibility-unavailable', 'Native focus visibility observation is unavailable');
  }
  return okResult(owner);
}

const scrollable = (value: string): boolean => /^(auto|scroll|hidden|overlay)$/u.test(value);
const parent = (element: Element): Element | null => element.assignedSlot ?? element.parentElement
  ?? (element.getRootNode() as ShadowRoot).host ?? null;
const length = (raw: string, extent: number): number => {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:px|%)$/u.test(raw)) return 0;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? raw.endsWith('%') ? extent * value / 100 : value : 0;
};
const rectangle = (box: DOMRectReadOnly): Rect => ({ x: box.left, y: box.top, width: box.width, height: box.height });
const spatialTransition = /(?:^|,)\s*(?:all|transform|translate|scale|rotate)\s*(?:,|$)/u;
function movingBox(element: Element, style: CSSStyleDeclaration): boolean {
  if (!spatialTransition.test(style.transitionProperty ?? '')) return false;
  return element.getAnimations?.().some(animation => animation.playState === 'running'
    && 'transitionProperty' in animation && /^(?:transform|translate|scale|rotate)$/u.test(String(animation.transitionProperty))
    && animation.effect?.getComputedTiming().endTime !== Infinity) ?? false;
}
const valid = (rect: Rect): boolean => Number.isFinite(rect.x) && Number.isFinite(rect.y)
  && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0;
function clientBox(element: HTMLElement): { readonly rect: Rect; readonly sx: number; readonly sy: number } | undefined {
  const box = rectangle(element.getBoundingClientRect()), sx = box.width / element.offsetWidth, sy = box.height / element.offsetHeight;
  if (!valid(box) || !Number.isFinite(sx) || sx <= 0 || !Number.isFinite(sy) || sy <= 0) return undefined;
  const rect = { x: box.x + element.clientLeft * sx, y: box.y + element.clientTop * sy, width: element.clientWidth * sx, height: element.clientHeight * sy };
  return valid(rect) ? { rect, sx, sy } : undefined;
}

class FocusVisibilityOwner implements FocusVisibilityConnection {
  #element: HTMLElement | undefined;
  #view: (Window & typeof globalThis) | undefined;
  #viewport: VisualViewport | undefined;
  #observer: ResizeObserver | undefined;
  #positionObserver: MutationObserver | undefined;
  #positionRoot: HTMLElement | undefined;
  #target: Element | undefined;
  #port: HTMLElement | undefined;
  #potentialPort: HTMLElement | undefined;
  #motionRoot: Element | undefined;
  #getFocusRoot: (() => HTMLElement | undefined) | undefined;
  #frame: number | undefined;
  #generation = 0;
  readonly #documentScroll: boolean;
  readonly #changed = (): void => { this.refresh(); };
  readonly #motionChanged = (event: Event): void => { if (event.target === this.#motionRoot) this.refresh(); };
  constructor(element: HTMLElement, documentScroll: boolean, getFocusRoot?: () => HTMLElement | undefined) {
    this.#element = element; this.#view = element.ownerDocument.defaultView ?? undefined;
    this.#documentScroll = documentScroll;
    this.#getFocusRoot = getFocusRoot;
  }
  connect(): boolean {
    const element = this.#element, view = this.#view;
    if (!element || !view || typeof view.ResizeObserver !== 'function'
      || typeof view.requestAnimationFrame !== 'function' || typeof view.cancelAnimationFrame !== 'function') return false;
    try {
      this.#viewport = view.visualViewport ?? undefined;
      element.addEventListener('focusin', this.#changed); element.addEventListener('focusout', this.#changed);
      view.addEventListener('resize', this.#changed);
      this.#viewport?.addEventListener('resize', this.#changed); this.#viewport?.addEventListener('scroll', this.#changed);
      this.#observer = new view.ResizeObserver(this.#changed); this.#observer.observe(element);
      this.refresh(); return true;
    } catch { return false; }
  }
  refresh(): void {
    const view = this.#view;
    if (!this.#element || !view || this.#frame !== undefined) return;
    const generation = this.#generation;
    this.#frame = view.requestAnimationFrame(() => {
      if (generation !== this.#generation) return;
      this.#frame = undefined; this.#reveal();
    });
  }
  disconnect(): void {
    const element = this.#element, view = this.#view;
    this.#generation++;
    if (this.#frame !== undefined) view?.cancelAnimationFrame(this.#frame);
    this.#frame = undefined; this.#observer?.disconnect(); this.#observer = undefined;
    this.#positionObserver?.disconnect(); this.#positionObserver = undefined; this.#positionRoot = undefined;
    this.#observeMotion();
    element?.removeEventListener('focusin', this.#changed); element?.removeEventListener('focusout', this.#changed);
    view?.removeEventListener('resize', this.#changed);
    this.#viewport?.removeEventListener('resize', this.#changed); this.#viewport?.removeEventListener('scroll', this.#changed);
    this.#element = undefined; this.#view = undefined; this.#viewport = undefined; this.#target = undefined; this.#port = undefined;
    this.#potentialPort = undefined; this.#getFocusRoot = undefined;
  }
  #observeMotion(element?: Element): void {
    if (element === this.#motionRoot) return;
    this.#motionRoot?.removeEventListener('transitionend', this.#motionChanged);
    this.#motionRoot?.removeEventListener('transitioncancel', this.#motionChanged);
    this.#motionRoot = element;
    element?.addEventListener('transitionend', this.#motionChanged);
    element?.addEventListener('transitioncancel', this.#motionChanged);
  }
  #observe(target?: Element, port?: HTMLElement, potentialPort?: HTMLElement, positionRoot?: HTMLElement): void {
    if (!target) this.#observeMotion();
    if (positionRoot !== this.#positionRoot) {
      this.#positionObserver?.disconnect(); this.#positionRoot = positionRoot;
      const view = this.#view;
      if (positionRoot && view && typeof view.MutationObserver === 'function') {
        try {
          this.#positionObserver ??= new view.MutationObserver(this.#changed);
          this.#positionObserver.observe(positionRoot, { attributes: true, attributeFilter: ['style'] });
        } catch { this.#positionObserver?.disconnect(); }
      }
    }
    if (target === this.#target && port === this.#port && potentialPort === this.#potentialPort) return;
    if (this.#target && this.#target !== this.#element) this.#observer?.unobserve(this.#target);
    if (this.#port && this.#port !== this.#target && this.#port !== this.#element) this.#observer?.unobserve(this.#port);
    if (this.#potentialPort && this.#potentialPort !== this.#target && this.#potentialPort !== this.#port && this.#potentialPort !== this.#element) this.#observer?.unobserve(this.#potentialPort);
    this.#target = target; this.#port = port; this.#potentialPort = potentialPort;
    if (target && target !== this.#element) this.#observer?.observe(target);
    if (port && port !== target && port !== this.#element) this.#observer?.observe(port);
    if (potentialPort && potentialPort !== target && potentialPort !== port && potentialPort !== this.#element) this.#observer?.observe(potentialPort);
  }
  #reveal(): void {
    const primary = this.#element, view = this.#view;
    if (!primary || !view || !primary.isConnected) { this.#observe(); return; }
    const document = primary.ownerDocument, scope = primary.getRootNode() as Document | ShadowRoot;
    let root: HTMLElement;
    try {
      root = this.#getFocusRoot?.() ?? primary;
      if (primary !== this.#element) return;
      if (!root.isConnected || root.ownerDocument !== document || root !== primary && root.getRootNode() !== scope) { this.#observe(); return; }
    } catch { this.#observe(); return; }
    let target = scope.activeElement;
    while (target?.shadowRoot?.activeElement) target = target.shadowRoot.activeElement;
    if (!target || !target.isConnected) { this.#observe(); return; }
    const visible = readViewportRect(document, view);
    if (!valid(visible)) { this.#observe(); return; }
    let clipped: Rect | null = visible;
    let port: HTMLElement | undefined, potentialPort: HTMLElement | undefined, positionRoot: HTMLElement | undefined, portStyle: CSSStyleDeclaration | undefined;
    let portBox: ReturnType<typeof clientBox>;
    let x = false, y = false, owned = false, motionRoot: Element | undefined;
    for (let node: Element | null = target; node; node = parent(node)) {
      const style = view.getComputedStyle(node);
      if (!hasPositiveAxisAlignedTransform(style, view)) { this.#observe(); return; }
      if (!motionRoot && movingBox(node, style)) motionRoot = node;
      if (node !== target) {
        const candidate = node as HTMLElement;
        if (root !== primary && !owned && (style.position === 'absolute' || style.position === 'fixed')) positionRoot = candidate;
        if (!owned && !potentialPort && (scrollable(style.overflowX) || scrollable(style.overflowY))) potentialPort = candidate;
        if (!owned && !port) {
          x = scrollable(style.overflowX) && candidate.scrollWidth > candidate.clientWidth;
          y = scrollable(style.overflowY) && candidate.scrollHeight > candidate.clientHeight;
          if (x || y) { port = candidate; portStyle = style; }
        }
        const clipX = scrollable(style.overflowX) || style.overflowX === 'clip';
        const clipY = scrollable(style.overflowY) || style.overflowY === 'clip';
        if (node === document.scrollingElement) {
          if (port === node) portBox = { rect: visible, sx: 1, sy: 1 };
        } else if (clipX || clipY || node === port) {
          const measured = clientBox(candidate);
          if (!measured) { this.#observe(); return; }
          if (node === port) portBox = measured;
          if (clipped) clipped = intersectRects(clipped, {
            x: clipX ? measured.rect.x : clipped.x, width: clipX ? measured.rect.width : clipped.width,
            y: clipY ? measured.rect.y : clipped.y, height: clipY ? measured.rect.height : clipped.height,
          });
        }
      }
      if (node === root) owned = true;
    }
    if (!owned) { this.#observe(); return; }
    if (!port && this.#documentScroll && root === primary) {
      port = document.scrollingElement ? document.scrollingElement as HTMLElement : undefined;
      if (port) { portStyle = view.getComputedStyle(port); portBox = { rect: visible, sx: 1, sy: 1 }; x = true; y = true; }
    }
    this.#observe(target, port, potentialPort, positionRoot);
    this.#observeMotion(motionRoot);
    if (motionRoot) return;
    if (!port || !portStyle || !portBox || !clipped) return;
    const { sx, sy } = portBox;
    const padded = insetRect(portBox.rect, { top: length(portStyle.scrollPaddingTop, port.clientHeight) * sy,
      right: length(portStyle.scrollPaddingRight, port.clientWidth) * sx, bottom: length(portStyle.scrollPaddingBottom, port.clientHeight) * sy,
      left: length(portStyle.scrollPaddingLeft, port.clientWidth) * sx });
    const boundary = intersectRects(padded, clipped);
    const style = view.getComputedStyle(target), targetBox = rectangle(target.getBoundingClientRect());
    if (!valid(targetBox) || style.visibility === 'hidden' || style.display === 'none') return;
    const expanded = outsetRect(targetBox, { top: length(style.scrollMarginTop, 0) * sy, right: length(style.scrollMarginRight, 0) * sx,
      bottom: length(style.scrollMarginBottom, 0) * sy, left: length(style.scrollMarginLeft, 0) * sx });
    const fitted = clampRect(expanded, boundary ?? clipped, undefined, 'nearest');
    let dx = x ? (expanded.x - fitted.x) / sx : 0, dy = y ? (expanded.y - fitted.y) / sy : 0;
    const crampedX = x && (!boundary || expanded.width > boundary.width) && targetBox.width <= clipped.width;
    const crampedY = y && (!boundary || expanded.height > boundary.height) && targetBox.height <= clipped.height;
    if (crampedX || crampedY) {
      const visible = clampRect(targetBox, clipped, undefined, 'nearest'), size = { width: targetBox.width, height: targetBox.height };
      if (crampedX) dx = visible.x !== targetBox.x ? (targetBox.x - alignRect(clipped, size, 'top', 'center').x) / sx : 0;
      if (crampedY) dy = visible.y !== targetBox.y ? (targetBox.y - alignRect(clipped, size, 'left', 'center').y) / sy : 0;
    }
    if (Math.abs(dx) > .5 || Math.abs(dy) > .5) port.scrollBy({ left: dx, top: dy, behavior: 'instant' });
  }
}
