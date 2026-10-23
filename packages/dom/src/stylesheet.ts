import { failResult, okResult, type Result } from '@sectile/core/result';

export type StylesheetErrorCode = 'dom.stylesheet-invalid' | 'dom.stylesheet-unavailable'
  | 'dom.stylesheet-disposed' | 'dom.stylesheet-reentrant' | 'dom.stylesheet-resource-limit';
export interface StylesheetOptions {
  readonly element: HTMLElement;
  readonly scopeId: string;
  readonly nonce?: string;
  /** Explicit server-owned output to adopt; no document-wide discovery is performed. */
  readonly style?: HTMLStyleElement;
  readonly maxCssCodeUnits?: number;
}
export interface StylesheetConnection {
  /** The caller owns CSS admission. Successful delivery is not a CSP or rendering certificate. */
  apply(css: string): Result<void, StylesheetErrorCode>;
  disconnect(): void;
}
const marker = 'data-sectile-style-scope';
const failure = (code: StylesheetErrorCode, message: string): Result<never, StylesheetErrorCode> =>
  failResult(code === 'dom.stylesheet-resource-limit' ? 'resource-rejection' : 'construction', code, message);
const disconnected = (): Result<never, StylesheetErrorCode> => failure('dom.stylesheet-disposed', 'Stylesheet connection is disconnected');

/** Owns one document stylesheet; platform effects start here, never at import time. */
export function connectStylesheet(options: StylesheetOptions): Result<StylesheetConnection, StylesheetErrorCode> {
  const scopeId = options.scopeId, maximum = options.maxCssCodeUnits ?? 8 * 1024 * 1024;
  if (typeof scopeId !== 'string' || !scopeId.length || scopeId.length > 128 || /[\u0000-\u001f\u007f]/u.test(scopeId)
    || !Number.isSafeInteger(maximum) || maximum < 1 || (options.nonce !== undefined && typeof options.nonce !== 'string')) {
    return failure('dom.stylesheet-invalid', 'Invalid stylesheet connection options');
  }
  let head: HTMLHeadElement | undefined, style: HTMLStyleElement | undefined;
  let original: string | null | undefined, accepted: string | undefined;
  let disposed = false, applying = false;
  const borrowed = options.style !== undefined;
  try {
    const document = options.element.ownerDocument, root = options.element.getRootNode();
    if (!document.head || (root.nodeType === 11 && 'host' in root)) return failure('dom.stylesheet-unavailable', 'Document styles cannot cross a shadow boundary');
    head = document.head;
    if (borrowed) {
      const candidate = options.style!;
      if (candidate.localName !== 'style' || candidate.ownerDocument !== document || candidate.parentNode !== head
        || candidate.getAttribute(marker) !== scopeId || (options.nonce !== undefined && candidate.nonce !== options.nonce)) {
        return failure('dom.stylesheet-invalid', 'Server stylesheet does not match its document, scope or authorization');
      }
      style = candidate;
      original = style.textContent;
      if (original !== null && original.length > maximum) return failure('dom.stylesheet-resource-limit', 'Server stylesheet exceeds its code-unit limit');
    } else {
      style = document.createElement('style');
      style.setAttribute(marker, scopeId);
      if (options.nonce !== undefined) style.nonce = options.nonce;
    }
  } catch { return failure('dom.stylesheet-unavailable', 'Stylesheet connection could not be prepared'); }

  const disconnect = (): void => {
    if (disposed) return;
    disposed = true;
    const node = style, parent = head, last = accepted, before = original;
    style = undefined; head = undefined; original = undefined; accepted = undefined;
    // A subsequent writer owns its edits. Never overwrite or remove that output.
    if (!node || !parent || node.parentNode !== parent || node.getAttribute(marker) !== scopeId || last === undefined || node.textContent !== last) return;
    if (borrowed) node.textContent = before ?? null;
    else parent.removeChild(node);
  };
  return okResult(Object.freeze({
    apply(css: string): Result<void, StylesheetErrorCode> {
      if (disposed) return disconnected();
      if (applying) return failure('dom.stylesheet-reentrant', 'Stylesheet connection is applying another revision');
      if (typeof css !== 'string') return failure('dom.stylesheet-invalid', 'Stylesheet requires CSS text');
      if (css.length > maximum) return failure('dom.stylesheet-resource-limit', 'Stylesheet exceeds its code-unit limit');
      const node = style!, parent = head!;
      applying = true;
      let before: string | null | undefined;
      const restore = original;
      try {
        if (node.getAttribute(marker) !== scopeId || (node.parentNode !== null && node.parentNode !== parent)) {
          return failure('dom.stylesheet-unavailable', 'Stylesheet ownership changed');
        }
        before = node.textContent;
        if (disposed) return disconnected();
        if ((accepted !== undefined && before !== accepted) || (borrowed && accepted === undefined && before !== original)) {
          return failure('dom.stylesheet-unavailable', 'Stylesheet output changed outside its connection');
        }
        const unchanged = accepted === css && node.parentNode === parent;
        if (disposed) return disconnected();
        if (unchanged) return okResult(undefined);
        node.textContent = css;
        if (disposed) {
          if (node.textContent === css) {
            if (borrowed) node.textContent = restore ?? null;
            else if (node.parentNode === parent) parent.removeChild(node);
          }
          return disconnected();
        }
        const detached = node.parentNode === null;
        if (disposed) return disconnected();
        if (detached) parent.appendChild(node);
        if (disposed) {
          if (!borrowed && node.parentNode === parent) parent.removeChild(node);
          return disconnected();
        }
        accepted = css;
        return okResult(undefined);
      } catch {
        try {
          if (!disposed && before !== undefined) {
            const current = node.textContent;
            if (!disposed && current === css) node.textContent = before;
          }
          if (!borrowed && accepted === undefined && node.parentNode === parent) parent.removeChild(node);
        }
        catch {
          try { disconnect(); } catch { /* Ownership is already released; the caller receives application failure. */ }
        }
        return disposed ? disconnected() : failure('dom.stylesheet-unavailable', 'Stylesheet application failed');
      } finally { applying = false; }
    },
    disconnect,
  }));
}
