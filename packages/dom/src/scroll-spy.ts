import { failResult, okResult, type Result } from '@sectile/core/result';
import { intersectRects, type Rect } from '@sectile/core/geometry';
import { isWellFormedPlainText } from '@sectile/core/text';
import { createExtentIndex, type ExtentIndex } from '@sectile/virtual/extent-index';
import { readViewportRect } from './internal/viewport.js';

export type ScrollSpyErrorCode = 'dom.scroll-spy-invalid' | 'dom.scroll-spy-unavailable' | 'dom.scroll-spy-disposed' | 'dom.scroll-spy-reentrant';
export type ScrollSpyHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
export interface ScrollSpyHeading { readonly id: string; readonly label: string; readonly level: ScrollSpyHeadingLevel; readonly depth: number }
export interface ScrollSpySnapshot {
  readonly headings: readonly ScrollSpyHeading[];
  /** Continuous row coordinates; each heading owns the interval until the next. */
  readonly start: number; readonly end: number;
  /** Inclusive visible row bounds, or -1/-1 for an empty intersection. */
  readonly first: number; readonly last: number;
}
export interface ScrollSpyOptions {
  /** Unique stable prefix for IDs assigned to headings that have no authored ID. */
  readonly id: string;
  readonly content: HTMLElement;
  /** Ignore one presentation subtree, including its own mutation feedback. */
  readonly exclude?: HTMLElement;
  readonly scrollRoot?: HTMLElement | Document;
  readonly levels?: readonly ScrollSpyHeadingLevel[];
  /** Occluded block-start pixels inside the actual visible scrollport. */
  readonly offset?: number;
  readonly onChange: (snapshot: ScrollSpySnapshot) => void;
  readonly onError?: (error: import('@sectile/core').SectileError<ScrollSpyErrorCode>) => void;
}
export interface ScrollSpyConnection {
  getSnapshot(): ScrollSpySnapshot;
  refresh(): Result<ScrollSpySnapshot, ScrollSpyErrorCode>;
  disconnect(): void;
}
const empty: ScrollSpySnapshot = /* @__PURE__ */ Object.freeze({ headings: Object.freeze([]), start: 0, end: 0, first: -1, last: -1 });
const capacity = /* @__PURE__ */ (() => createExtentIndex([]).maxItems)();
const invalid = (message: string): Result<never, ScrollSpyErrorCode> => failResult('construction', 'dom.scroll-spy-invalid', message);
const validID = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && !/\s/u.test(value) && isWellFormedPlainText(value);
interface Host {
  content: HTMLElement; root: HTMLElement | Document; document: Document; view: Window & typeof globalThis;
  exclude: HTMLElement | undefined;
  change: ScrollSpyOptions['onChange'] | undefined; error: ScrollSpyOptions['onError'];
}

/** One scoped measurement lifetime. No scrolling, URL or focus effects. */
export function connectScrollSpy(options: ScrollSpyOptions): Result<ScrollSpyConnection, ScrollSpyErrorCode> {
  const content = options.content, document = content?.ownerDocument, view = document?.defaultView;
  const root = options.scrollRoot ?? document, id = options.id, offset = options.offset ?? 0;
  const levels = options.levels ?? [2, 3];
  if (!content || content.nodeType !== 1 || !document || !view || !root || !validID(id)
    || !Number.isFinite(offset) || offset < 0 || typeof options.onChange !== 'function'
    || options.onError !== undefined && typeof options.onError !== 'function'
    || options.exclude !== undefined && (!options.exclude || options.exclude.nodeType !== 1 || options.exclude.ownerDocument !== document || options.exclude === content || options.exclude.contains(content))
    || !Array.isArray(levels) || !levels.length || levels.length > 6 || new Set(levels).size !== levels.length
    || levels.some(level => !Number.isInteger(level) || level < 1 || level > 6)
    || root !== document && (root.nodeType !== 1 || root.ownerDocument !== document || !root.contains(content))) {
    return invalid('ScrollSpy requires one content/root document, a unique ID, valid heading levels and a finite nonnegative offset');
  }
  if (typeof view.ResizeObserver !== 'function' || typeof view.MutationObserver !== 'function'
    || typeof view.requestAnimationFrame !== 'function' || typeof view.cancelAnimationFrame !== 'function') {
    return failResult('construction', 'dom.scroll-spy-unavailable', 'ScrollSpy requires native frame, resize and mutation observation');
  }
  return connect({ content, root, document, view, exclude: options.exclude, change: options.onChange, error: options.onError }, id, levels.map(level => 'h' + level).join(','), offset);
}

function connect(initial: Host, prefix: string, selector: string, offset: number): Result<ScrollSpyConnection, ScrollSpyErrorCode> {
  let host: Host | undefined = initial, snapshot = empty, headings: HTMLElement[] = [], ancestors: HTMLElement[] = [];
  let visibleHeadings = new Set<HTMLElement>();
  let index: ExtentIndex | undefined, origin = 0, generated = 0;
  let flowClip: Rect | null = null, localViewport: Rect | null = null;
  let frame: number | undefined, dirty = true, collect = true, clipping = true, running = false;
  const owned = new Map<HTMLElement, string>();
  const restore = (element: HTMLElement, id: string): void => { if (element.id === id) element.removeAttribute('id'); };
  const notify = (next: ScrollSpySnapshot): void => { snapshot = next; host?.change?.(next); };
  const scrollTop = (): number => {
    const h = host!; return h.root === h.document ? h.view.scrollY : (h.root as HTMLElement).scrollTop;
  };
  const coordinateOrigin = (): number => {
    const h = host!; if (h.root === h.document) return 0;
    const element = h.root as HTMLElement; return element.getBoundingClientRect().top + element.clientTop;
  };
  const measureClip = (): void => {
    const h = host!, viewport = readViewportRect(h.document, h.view);
    const root = h.root === h.document ? undefined : h.root as HTMLElement;
    const rootBox = root?.getBoundingClientRect(), top = root ? rootBox!.top + root.clientTop : 0, left = root ? rootBox!.left + root.clientLeft : 0;
    const xOffset = root ? root.scrollLeft : h.view.scrollX, yOffset = scrollTop();
    const contentBox = h.content.getBoundingClientRect(), x = Math.min(0, contentBox.left - left + xOffset), y = Math.min(0, contentBox.top - top + yOffset);
    const scroller = root ?? h.document.scrollingElement;
    let flow: Rect | null = { x, y, width: Math.max(scroller?.scrollWidth ?? 0, contentBox.right - left + xOffset, viewport.width + xOffset) - x,
      height: Math.max(scroller?.scrollHeight ?? 0, contentBox.bottom - top + yOffset, viewport.height + yOffset) - y };
    let visible: Rect | null = root ? intersectRects(viewport, { x: left, y: top, width: root.clientWidth, height: root.clientHeight }) : viewport;
    for (const element of ancestors) {
      const style = h.view.getComputedStyle(element), x = /^(auto|scroll|hidden|clip)$/u.test(style.overflowX), y = /^(auto|scroll|hidden|clip)$/u.test(style.overflowY);
      if (!x && !y) continue;
      const inside = !root || root.contains(element), previous = inside ? flow : visible;
      if (!previous) continue;
      const box = element.getBoundingClientRect(), clipped = intersectRects(previous, {
        x: x ? box.left + element.clientLeft + (inside ? xOffset - left : 0) : previous.x,
        y: y ? box.top + element.clientTop + (inside ? yOffset - top : 0) : previous.y,
        width: x ? element.clientWidth : previous.width, height: y ? element.clientHeight : previous.height,
      });
      if (inside) flow = clipped; else visible = clipped;
    }
    flowClip = flow;
    localViewport = visible ? { ...visible, x: visible.x - left, y: visible.y - top } : null;
  };
  const resize = (): void => { dirty = true; clipping = true; schedule(); };
  const windowResize = (): void => { collect = true; resize(); };
  const viewport = (): void => { clipping = true; schedule(); };
  const observer = new initial.view.ResizeObserver(entries => {
    const h = host;
    if (h) for (const entry of entries) {
      const element = entry.target;
      if (element instanceof h.view.HTMLElement && element.matches(selector)
        && (element.getClientRects().length > 0) !== visibleHeadings.has(element)) { collect = true; break; }
    }
    resize();
  });
  const mutations = new initial.view.MutationObserver(records => {
    const h = host; if (!h) return;
    if (!records.length || records.some(record => !h.exclude?.contains(record.target))) { collect = true; resize(); }
  });
  const discover = (): Result<readonly ScrollSpyHeading[], ScrollSpyErrorCode> => {
    const h = host!, nodes = h.content.querySelectorAll<HTMLElement>(selector);
    if (nodes.length > capacity) return invalid('ScrollSpy exceeds the canonical extent capacity');
    const flow = Array.from(h.content.querySelectorAll<HTMLElement>('*')), excluded = new Set<Element>(), presentation = new Set<Element>();
    const contentExcluded = h.content.closest('[hidden],[inert],[aria-hidden="true"]') !== null;
    for (const element of flow) {
      if (element === h.exclude || element.parentElement && presentation.has(element.parentElement)) presentation.add(element);
      if (contentExcluded || presentation.has(element) || element.parentElement && excluded.has(element.parentElement)
        || element.hasAttribute('hidden') || element.hasAttribute('inert') || element.getAttribute('aria-hidden') === 'true') excluded.add(element);
    }
    const next: HTMLElement[] = [], metadata: ScrollSpyHeading[] = [], ids = new Set<string>(), keep = new Set<HTMLElement>(), assign = new Map<HTMLElement, string>(), stack: number[] = [];
    for (const element of nodes) {
      const label = element.textContent?.trim() ?? '';
      if (!label || excluded.has(element) || !element.getClientRects().length) continue;
      if (!isWellFormedPlainText(label)) return invalid('Heading labels require well-formed plain text');
      let id = element.id;
      if (!id) {
        if (generated === Number.MAX_SAFE_INTEGER) return invalid('Generated heading identity capacity exhausted');
        id = prefix + '-heading-' + (++generated); assign.set(element, id);
      }
      const collision = h.document.getElementById(id);
      if (!validID(id) || ids.has(id) || collision !== null && collision !== element) return invalid('Heading IDs must be valid and unique');
      const level = Number(element.tagName.slice(1)) as ScrollSpyHeadingLevel;
      while (stack.length && stack[stack.length - 1]! >= level) stack.pop();
      metadata.push(Object.freeze({ id, label, level, depth: stack.length })); stack.push(level);
      ids.add(id); keep.add(element); next.push(element);
    }
    for (const [element, id] of owned) if (!keep.has(element) || element.id !== id) { restore(element, id); owned.delete(element); }
    for (const [element, id] of assign) { element.id = id; owned.set(element, id); }
    headings = next; visibleHeadings = keep; ancestors = [];
    const root = h.root === h.document ? undefined : h.root as HTMLElement;
    for (let element = h.content.parentElement; element; element = element.parentElement) if (element !== root) ancestors.push(element);
    observer.disconnect(); observer.observe(h.content);
    for (const element of flow) if (!presentation.has(element) || element === h.exclude) observer.observe(element);
    for (const element of ancestors) observer.observe(element);
    if (root && root !== h.content) observer.observe(root);
    mutations.disconnect();
    mutations.observe(h.content, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['id', 'hidden', 'inert', 'aria-hidden', 'class', 'style'] });
    for (const element of ancestors) mutations.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'inert', 'aria-hidden'] });
    return okResult(Object.freeze(metadata));
  };
  const project = (edge: number): number => {
    if (!index || edge < origin) return 0;
    const local = edge - origin;
    if (local >= index.totalExtent) return index.size;
    const location = index.locateOffset(local);
    return location ? location.index + location.offsetWithin / (location.extent.kind === 'unknown' ? location.extent.fallback : location.extent.value) : 0;
  };
  const flush = (): Result<ScrollSpySnapshot, ScrollSpyErrorCode> => {
    if (!host) return failResult('construction', 'dom.scroll-spy-disposed', 'ScrollSpy is disconnected');
    if (running) return failResult('construction', 'dom.scroll-spy-reentrant', 'ScrollSpy is already delivering native measurements');
    if (frame !== undefined) { host.view.cancelAnimationFrame(frame); frame = undefined; }
    running = true;
    try {
      let metadata = snapshot.headings;
      if (collect) { const result = discover(); if (!result.ok) return result; metadata = result.value; collect = false; dirty = true; }
      const top = scrollTop();
      if (dirty) {
        const h = host, nativeOrigin = coordinateOrigin();
        const positions = headings.map(element => element.getBoundingClientRect().top - nativeOrigin + top);
        const end = h.root === h.content ? h.content.scrollHeight : h.content.getBoundingClientRect().bottom - nativeOrigin + top;
        if (!Number.isFinite(end) || positions.some((position, i) => !Number.isFinite(position) || position > end || i > 0 && position < positions[i - 1]!
          || !Number.isFinite((positions[i + 1] ?? end) - position))) return invalid('ScrollSpy requires finite normal block-flow heading positions');
        origin = positions[0] ?? end;
        index = createExtentIndex(positions.map((position, i) => ({ kind: 'exact', value: (positions[i + 1] ?? end) - position })));
        dirty = false;
      }
      if (clipping) { measureClip(); clipping = false; }
      const left = host.root === host.document ? host.view.scrollX : (host.root as HTMLElement).scrollLeft;
      const visible = flowClip && localViewport && intersectRects(flowClip, { ...localViewport, x: localViewport.x + left, y: localViewport.y + top });
      const startEdge = visible ? visible.y + Math.min(offset, visible.height) : top, endEdge = visible ? visible.y + visible.height : startEdge;
      const start = project(startEdge), end = Math.max(start, project(endEdge));
      const next = Object.freeze({ headings: metadata, start, end, first: end > start ? Math.floor(start) : -1, last: end > start ? Math.ceil(end) - 1 : -1 });
      if (metadata !== snapshot.headings || start !== snapshot.start || end !== snapshot.end) notify(next);
      return okResult(host ? snapshot : empty);
    } finally { running = false; }
  };
  const deliver = (): void => {
    frame = undefined; if (!host) return;
    report(flush());
  };
  const report = (result: Result<ScrollSpySnapshot, ScrollSpyErrorCode>): Result<ScrollSpySnapshot, ScrollSpyErrorCode> => {
    if (!result.ok && result.error.code !== 'dom.scroll-spy-reentrant' && host) {
      collect = true; dirty = true; clipping = true;
      if (snapshot !== empty) notify(empty);
      host?.error?.(result.error);
    }
    return result;
  };
  function schedule(): void { if (host && frame === undefined) frame = host.view.requestAnimationFrame(deliver); }
  const onScroll = (event: Event): void => {
    const h = host; if (!h) return;
    const target = event.target;
    if (target === h.root || h.root === h.document && (target === h.view || target === h.document)) { schedule(); return; }
    if (target === h.view || target === h.document) { viewport(); return; }
    if (target instanceof h.view.Element && h.content.contains(target)) { dirty = true; schedule(); }
    else if (target instanceof h.view.Element && target.contains(h.content)) {
      if (h.root !== h.document && h.root.contains(target)) dirty = true;
      viewport();
    }
  };
  const disconnect = (): void => {
    const h = host; if (!h) return; host = undefined;
    h.view.removeEventListener('scroll', onScroll, true); h.view.removeEventListener('resize', windowResize);
    if (h.root !== h.document) h.root.removeEventListener('scroll', onScroll);
    h.view.visualViewport?.removeEventListener('resize', viewport); h.view.visualViewport?.removeEventListener('scroll', viewport);
    h.document.fonts?.removeEventListener('loadingdone', resize); h.document.fonts?.removeEventListener('loadingerror', resize);
    observer.disconnect(); mutations.disconnect();
    if (frame !== undefined) h.view.cancelAnimationFrame(frame);
    frame = undefined; h.change = undefined; h.error = undefined;
    for (const [element, id] of owned) restore(element, id);
    owned.clear(); visibleHeadings.clear(); headings = []; ancestors = []; index = undefined; snapshot = empty; flowClip = null; localViewport = null;
  };
  initial.view.addEventListener('scroll', onScroll, { capture: true, passive: true }); initial.view.addEventListener('resize', windowResize, { passive: true });
  if (initial.root !== initial.document) initial.root.addEventListener('scroll', onScroll, { passive: true });
  initial.view.visualViewport?.addEventListener('resize', viewport, { passive: true }); initial.view.visualViewport?.addEventListener('scroll', viewport, { passive: true });
  initial.document.fonts?.addEventListener('loadingdone', resize); initial.document.fonts?.addEventListener('loadingerror', resize);
  let first: Result<ScrollSpySnapshot, ScrollSpyErrorCode>;
  try { first = flush(); } catch (error) { disconnect(); throw error; }
  if (!first.ok) { disconnect(); return first; }
  return okResult(Object.freeze({ getSnapshot: () => snapshot, refresh: () => { collect = true; dirty = true; clipping = true; return report(flush()); }, disconnect }));
}
