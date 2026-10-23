/** Browser font ink, not an editing state or a replacement native editor. */
export interface TextInkMetrics {
  readonly ascent: number; readonly descent: number;
  readonly fontAscent: number; readonly fontDescent: number;
}
export interface TextInkConnection {
  refresh(): void;
  disconnect(): void;
}
const contexts = /* @__PURE__ */ new WeakMap<Document, CanvasRenderingContext2D | null>();
function context(document: Document): CanvasRenderingContext2D | null {
  if (contexts.has(document)) return contexts.get(document)!;
  let value: CanvasRenderingContext2D | null = null;
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    value = canvas.getContext('2d');
  } catch { /* Native capability can be unavailable in SSR/DOM facades. */ }
  contexts.set(document, value); return value;
}

/** One latest-value projection; native editing keeps its baseline until blur. */
export function observeTextInk(options: {
  readonly element: HTMLElement;
  readonly text: () => string | undefined;
  readonly multiline?: boolean;
  readonly freezeWhileEditing?: boolean;
  readonly onChange: (metrics: TextInkMetrics | undefined) => void;
}): TextInkConnection {
  let element: HTMLElement | null = options.element;
  let read: (() => string | undefined) | null = options.text;
  let publish: ((metrics: TextInkMetrics | undefined) => void) | null = options.onChange;
  let fonts: FontFaceSet | null = element.ownerDocument.fonts ?? null;
  const multiline = options.multiline === true, freeze = options.freezeWhileEditing === true;
  let lastFont = '', lastText = '', dirty = true;
  const refresh = (): void => {
    const target = element;
    if (!target || !read || !publish || !target.isConnected) return;
    if (freeze && lastFont && target.ownerDocument.activeElement === target) return;
    const value = read();
    if (value === undefined) { lastText = ''; dirty = true; publish(undefined); return; }
    const text = value.length > 512 || value.length === 0 ? 'Hg' : value;
    const style = target.ownerDocument.defaultView?.getComputedStyle(target);
    if (!style || !style.font || style.font.length > 2048) { publish(undefined); return; }
    if (!dirty && lastFont === style.font && lastText === text) return;
    dirty = false; lastFont = style.font; lastText = text;
    const canvas = context(target.ownerDocument);
    if (!canvas) { publish(undefined); return; }
    let metrics: TextInkMetrics | undefined;
    try {
      canvas.font = style.font; canvas.textBaseline = 'alphabetic'; canvas.textAlign = 'left';
      const start = multiline ? text.indexOf('\n') : -1, end = multiline ? text.lastIndexOf('\n') : -1;
      const first = canvas.measureText(start < 0 ? text : text.slice(0, start) || 'Hg');
      const last = end < 0 ? first : canvas.measureText(text.slice(end + 1) || 'Hg');
      const ascent = first.actualBoundingBoxAscent, descent = last.actualBoundingBoxDescent;
      const fontAscent = first.fontBoundingBoxAscent, fontDescent = first.fontBoundingBoxDescent;
      if ([ascent, descent, fontAscent, fontDescent].every(Number.isFinite) && ascent + descent > 0)
        metrics = { ascent, descent, fontAscent, fontDescent };
    } catch { /* A native measurement failure preserves the CSS fallback. */ }
    publish(metrics);
  };
  const fontChanged = (): void => { dirty = true; refresh(); };
  const disconnect = (): void => {
    if (!element) return;
    fonts?.removeEventListener('loadingdone', fontChanged);
    if (freeze) element.removeEventListener('blur', refresh);
    element = null; fonts = null; read = null; publish = null; lastFont = lastText = '';
  };
  fonts?.addEventListener('loadingdone', fontChanged);
  if (freeze) element.addEventListener('blur', refresh);
  try { refresh(); } catch (error) { disconnect(); throw error; }
  return { refresh, disconnect };
}
