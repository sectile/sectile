import { failResult, okResult, type Result } from '@sectile/core/result';

export type LayoutBasisErrorCode = 'dom.layout-basis-invalid' | 'dom.layout-basis-unavailable'
  | 'dom.layout-basis-disposed' | 'dom.layout-basis-reentrant';
/** Native logical dimensions in CSS pixels; no portable fitting decision. */
export interface LayoutBasisSize { readonly inlineSize: number; readonly blockSize: number }
export interface LayoutBasisPadding {
  readonly inlineStart: number; readonly inlineEnd: number;
  readonly blockStart: number; readonly blockEnd: number;
}
export interface LayoutBasisSnapshot {
  readonly connected: boolean;
  readonly contentSize?: LayoutBasisSize;
  /** Content box of the explicitly observed actual parent, never an assumed viewport. */
  readonly parentSize?: LayoutBasisSize;
  /** Present only when explicit allocation or parent observation was requested. */
  readonly borderSize?: LayoutBasisSize;
  /** Complete border boxes in the caller's declared order; absent while any fact is missing. */
  readonly allocations?: readonly LayoutBasisSize[];
  readonly rootFontSize?: number;
  /** Complete requested resolved logical padding in CSS pixels; unknown sides omit the record. */
  readonly padding?: LayoutBasisPadding;
  /** Bounded scalar CSS projection, interpreted by its semantic owner. */
  readonly projection?: string;
}
export interface LayoutBasisOptions {
  readonly element: HTMLElement;
  /** Target box whose changes trigger delivery; snapshot fields are unchanged.
   * Defaults to border-box for unparented allocations, content-box otherwise. */
  readonly box?: 'content-box' | 'border-box';
  /** A descendant size probe; its CSS owner makes projection/font changes resize it. */
  readonly marker: HTMLElement;
  /** Optional direct parent content box, sharing the existing observer. By default
   * the target observes content-box changes and also publishes its delivered border box. */
  readonly parent?: HTMLElement;
  /** At most 128 distinct descendant border boxes, sharing this boundary's observer. */
  readonly allocations?: readonly HTMLElement[];
  /** Read resolved logical padding on native delivery/invalidation. Default false adds no style read. */
  readonly padding?: boolean;
  /** Selected semantic family names; completion/error revokes facts even when boxes stay fixed.
   * Absence/empty observes no font events. Uncertain native family spelling invalidates conservatively. */
  readonly fontFamilies?: readonly string[];
  readonly property: `--${string}`;
  readonly onChange: (snapshot: LayoutBasisSnapshot) => void;
}
export interface LayoutBasisConnection {
  /** Revoke old measurements before a changed style/basis revision is observed. */
  invalidate(): Result<void, LayoutBasisErrorCode>;
  disconnect(): void;
}
const unavailable: LayoutBasisSnapshot = /* @__PURE__ */ Object.freeze({ connected: false });
const failure = (code: LayoutBasisErrorCode, message: string): Result<never, LayoutBasisErrorCode> => failResult('construction', code, message);
const size = (values: readonly ResizeObserverSize[] | undefined): LayoutBasisSize | undefined => {
  const value = values?.length === 1 ? values[0] : undefined;
  return value && Number.isFinite(value.inlineSize) && value.inlineSize >= 0 && Number.isFinite(value.blockSize) && value.blockSize >= 0
    ? Object.freeze({ inlineSize: value.inlineSize, blockSize: value.blockSize }) : undefined;
};
const sameSize = (a: LayoutBasisSize | undefined, b: LayoutBasisSize | undefined): boolean =>
  a === b || (a !== undefined && b !== undefined && a.inlineSize === b.inlineSize && a.blockSize === b.blockSize);
const pixels = (raw: unknown): number | undefined => {
  if (typeof raw !== 'string' || !/^(?:\d+(?:\.\d*)?|\.\d+)px$/u.test(raw)) return undefined;
  const value = Number(raw.slice(0, -2));
  return Number.isFinite(value) ? value : undefined;
};
// A filter fast path, not a CSS parser: uncertain escaping/case folding must not retain stale facts.
const nativeFamily = (raw: string): string | undefined => {
  if (/[^\x20-\x7e]|\\/u.test(raw)) return undefined;
  const value = raw.trim(), first = value[0];
  if (first === '"' || first === "'") {
    return value.length >= 2 && value.at(-1) === first ? value.slice(1, -1).toLowerCase() : undefined;
  }
  return /["',]/u.test(value) ? undefined : value.replace(/ +/gu, ' ').toLowerCase();
};

/** One native observer per boundary; resources begin here, never at module import. */
export function connectLayoutBasis(options: LayoutBasisOptions): Result<LayoutBasisConnection, LayoutBasisErrorCode> {
  let element: HTMLElement | undefined = options.element, marker: HTMLElement | undefined = options.marker;
  let parent: HTMLElement | undefined = options.parent;
  const parentMode = options.parent !== undefined;
  let subscriber: LayoutBasisOptions['onChange'] | undefined = options.onChange;
  const property = options.property;
  const allocationMode = options.allocations !== undefined;
  const paddingMode = options.padding === true;
  const requestedBox = options.box;
  if (!element || !marker || element.nodeType !== 1 || marker.nodeType !== 1 || element === marker
    || element.ownerDocument !== marker.ownerDocument || !element.contains(marker)
    || typeof subscriber !== 'function' || typeof property !== 'string' || property.length > 128 || !/^--[-_a-zA-Z0-9]+$/u.test(property)
    || options.padding !== undefined && typeof options.padding !== 'boolean') {
    return failure('dom.layout-basis-invalid', 'Layout basis requires one host and its scalar projection probe');
  }
  if (parentMode && (!parent || parent.nodeType !== 1 || parent.ownerDocument !== element.ownerDocument || element.parentElement !== parent)) {
    return failure('dom.layout-basis-invalid', 'Layout parent observation requires the actual direct parent in the same document');
  }
  if (requestedBox !== undefined && requestedBox !== 'content-box' && requestedBox !== 'border-box') {
    return failure('dom.layout-basis-invalid', 'Layout observation box requires content-box or border-box');
  }
  const observedBox = requestedBox ?? (allocationMode && !parentMode ? 'border-box' : 'content-box');
  if (allocationMode && (!Array.isArray(options.allocations) || options.allocations.length > 128)) {
    return failure('dom.layout-basis-invalid', 'Layout allocations require at most 128 descendant elements');
  }
  const allocations = allocationMode ? [...options.allocations!] : [];
  const allocationIndex = new Map<HTMLElement, number>();
  for (let index = 0; index < allocations.length; index++) {
    const target = allocations[index]!;
    if (!target || target.nodeType !== 1 || target === element || target === marker || allocationIndex.has(target)
      || target.ownerDocument !== element.ownerDocument || !element.contains(target)) {
      return failure('dom.layout-basis-invalid', 'Layout allocations require distinct descendants of the same boundary');
    }
    allocationIndex.set(target, index);
  }
  let document: Document | undefined = element.ownerDocument, view: NonNullable<Document['defaultView']> | undefined = document.defaultView ?? undefined;
  if (!view || typeof view.ResizeObserver !== 'function') return failure('dom.layout-basis-unavailable', 'Layout basis requires a native ResizeObserver');
  if (options.fontFamilies !== undefined && !Array.isArray(options.fontFamilies)) {
    return failure('dom.layout-basis-invalid', 'Layout fonts require nonblank semantic family names');
  }
  const families = new Set<string>();
  let uncertainFamilies = false;
  for (const family of options.fontFamilies ?? []) {
    if (typeof family !== 'string' || !family.trim()) return failure('dom.layout-basis-invalid', 'Layout fonts require nonblank semantic family names');
    if (/[^\x20-\x7e]/u.test(family)) uncertainFamilies = true;
    families.add(family.toLowerCase());
  }
  let fonts: FontFaceSet | undefined = families.size ? document.fonts : undefined;
  if (families.size && (!fonts || typeof fonts.addEventListener !== 'function' || typeof fonts.removeEventListener !== 'function')) {
    return failure('dom.layout-basis-unavailable', 'Layout font observation requires a native FontFaceSet');
  }
  let observer: ResizeObserver | undefined, content: LayoutBasisSize | undefined, probe: LayoutBasisSize | undefined;
  let border: LayoutBasisSize | undefined, parentSize: LayoutBasisSize | undefined;
  const measured: (LayoutBasisSize | undefined)[] = Array.from({ length: allocations.length });
  let allocationSnapshot: readonly LayoutBasisSize[] | undefined;
  const clearMeasurements = (): void => {
    content = undefined; probe = undefined; border = undefined; parentSize = undefined;
    measured.fill(undefined); allocationSnapshot = undefined;
  };
  let previous: LayoutBasisSnapshot | undefined, disposed = false, updating = false, publishing = false;
  const stop = (notify: boolean): void => {
    if (disposed) return;
    disposed = true;
    const held = observer, callback = subscriber, wasConnected = previous?.connected;
    const heldFonts = fonts; fonts = undefined;
    observer = undefined; subscriber = undefined; element = undefined; marker = undefined; parent = undefined; document = undefined; view = undefined;
    clearMeasurements(); previous = undefined;
    allocations.length = 0; measured.length = 0; allocationIndex.clear();
    families.clear();
    try {
      try { heldFonts?.removeEventListener('loadingdone', fontChanged); }
      finally { heldFonts?.removeEventListener('loadingerror', fontChanged); }
    }
    finally {
      try { held?.disconnect(); }
      finally { if (notify && wasConnected) callback?.(unavailable); }
    }
  };
  const publish = (): void => {
    if (disposed || publishing) return;
    publishing = true;
    try {
      const connected = element!.ownerDocument === document && marker!.ownerDocument === document
        && element!.isConnected && marker!.isConnected && element!.contains(marker!)
        && (!parentMode || (parent!.ownerDocument === document && parent!.isConnected && element!.parentElement === parent))
        && allocations.every(target => target.ownerDocument === document && target.isConnected && element!.contains(target));
      let projection: string | undefined, rootFontSize: number | undefined, padding: LayoutBasisPadding | undefined;
      if (!connected) clearMeasurements();
      if (allocationMode && connected && !allocationSnapshot && measured.every(value => value !== undefined)) {
        allocationSnapshot = Object.freeze(measured.slice() as LayoutBasisSize[]);
      }
      if (connected && content && probe && probe.inlineSize > 0 && probe.blockSize > 0) {
        try {
          const raw = view!.getComputedStyle(marker!).getPropertyValue(property);
          if (raw.length <= 128) {
            const value = raw.trim();
            if (value.length > 0) projection = value;
          }
          const font = pixels(view!.getComputedStyle(document!.documentElement).fontSize);
          if (font !== undefined && font > 0) rootFontSize = font;
          if (paddingMode) {
            const style = view!.getComputedStyle(element!);
            const inlineStart = pixels(style.paddingInlineStart), inlineEnd = pixels(style.paddingInlineEnd);
            const blockStart = pixels(style.paddingBlockStart), blockEnd = pixels(style.paddingBlockEnd);
            if (inlineStart !== undefined && inlineEnd !== undefined && blockStart !== undefined && blockEnd !== undefined) {
              const old = previous?.padding;
              padding = old && old.inlineStart === inlineStart && old.inlineEnd === inlineEnd && old.blockStart === blockStart && old.blockEnd === blockEnd
                ? old : Object.freeze({ inlineStart, inlineEnd, blockStart, blockEnd });
            }
          }
        } catch { /* Unavailable platform output stays unknown; no assumed font or projection. */ }
      }
      if (disposed) return;
      if (previous && previous.connected === connected && sameSize(previous.contentSize, content)
        && sameSize(previous.borderSize, border) && sameSize(previous.parentSize, parentSize) && previous.allocations === allocationSnapshot
        && previous.projection === projection && previous.rootFontSize === rootFontSize && previous.padding === padding) return;
      previous = Object.freeze({ connected, ...(content ? { contentSize: content } : {}),
        ...(parentSize ? { parentSize } : {}),
        ...(border ? { borderSize: border } : {}), ...(allocationSnapshot ? { allocations: allocationSnapshot } : {}),
        ...(padding ? { padding } : {}),
        ...(projection === undefined ? {} : { projection }), ...(rootFontSize === undefined ? {} : { rootFontSize }) });
      subscriber?.(previous);
    } catch (error) {
      try { stop(false); } catch { /* Preserve the subscriber's original failure. */ }
      throw error;
    } finally { publishing = false; }
  };
  const invalidate = (): Result<void, LayoutBasisErrorCode> => {
    if (disposed) return failure('dom.layout-basis-disposed', 'Layout basis is disconnected');
    if (updating || publishing) return failure('dom.layout-basis-reentrant', 'Layout basis is publishing another revision');
    updating = true;
    try {
      const held = observer; observer = undefined;
      try { held?.disconnect(); }
      catch { stop(false); return failure('dom.layout-basis-unavailable', 'Layout observer could not be released'); }
      clearMeasurements();
      publish();
      if (disposed) return failure('dom.layout-basis-disposed', 'Layout basis disconnected during invalidation');
      try {
        const current = new view!.ResizeObserver((entries, source): void => {
          if (disposed || observer !== source) return;
          for (const entry of entries) {
            if (entry.target === element) {
              content = size(entry.contentBoxSize);
              if (allocationMode || parentMode) border = size(entry.borderBoxSize);
            }
            else if (entry.target === marker) probe = size(entry.contentBoxSize);
            else if (parentMode && entry.target === parent) parentSize = size(entry.contentBoxSize);
            else {
              const index = allocationIndex.get(entry.target as HTMLElement);
              if (index === undefined) continue;
              const next = size(entry.borderBoxSize);
              if (!sameSize(measured[index], next)) { measured[index] = next; allocationSnapshot = undefined; }
            }
          }
          publish();
        });
        observer = current;
        current.observe(element!, { box: observedBox });
        if (disposed || observer !== current) return failure('dom.layout-basis-disposed', 'Layout basis disconnected during observation');
        current.observe(marker!, { box: 'content-box' });
        if (disposed || observer !== current) return failure('dom.layout-basis-disposed', 'Layout basis disconnected during observation');
        if (parent) {
          current.observe(parent, { box: 'content-box' });
          if (disposed || observer !== current) return failure('dom.layout-basis-disposed', 'Layout basis disconnected during observation');
        }
        for (const target of allocations) {
          current.observe(target, { box: 'border-box' });
          if (disposed || observer !== current) return failure('dom.layout-basis-disposed', 'Layout basis disconnected during observation');
        }
      } catch {
        stop(false);
        return failure('dom.layout-basis-unavailable', 'Layout observer could not be connected');
      }
      return okResult(undefined);
    } finally { updating = false; }
  };
  const fontChanged = (event: Event): void => {
    if (disposed || (!content && !probe && !border && !parentSize && !allocationSnapshot)) return;
    const faces = (event as FontFaceSetLoadEvent).fontfaces;
    if (!faces) { invalidate(); return; }
    for (const face of faces) {
      const family = nativeFamily(face.family);
      if (uncertainFamilies || family === undefined || families.has(family)) { invalidate(); return; }
    }
  };
  try {
    fonts?.addEventListener('loadingdone', fontChanged);
    fonts?.addEventListener('loadingerror', fontChanged);
  } catch {
    stop(false);
    return failure('dom.layout-basis-unavailable', 'Layout font observation could not be connected');
  }
  const connected = invalidate();
  return connected.ok ? okResult(Object.freeze({ invalidate, disconnect: (): void => stop(true) })) : connected;
}
