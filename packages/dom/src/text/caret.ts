import type { PositionRect } from '../position.js';

// Layout inputs only: the mirror never inherits an application's div presentation.
const typography = ['direction', 'writing-mode', 'text-orientation', 'font-family', 'font-size', 'font-weight',
  'font-style', 'font-stretch', 'font-variant', 'font-feature-settings', 'font-variation-settings', 'font-kerning',
  'font-optical-sizing', 'font-size-adjust', 'font-synthesis', 'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-align-last', 'text-indent', 'text-transform', 'text-rendering', 'unicode-bidi', 'tab-size',
  'white-space', 'overflow-wrap', 'word-break', 'line-break', 'hyphens'] as const;
const pixels = (value: string): number => Number.parseFloat(value) || 0;

/** Read-only viewport geometry; all mirrored text and native Range resources are temporary. */
export function measureTextCaretRect(element: HTMLElement): PositionRect | undefined {
  let mirror: HTMLDivElement | undefined;
  try {
    const document = element.ownerDocument, view = document.defaultView;
    if (!view || !element.isConnected || !document.documentElement) return undefined;
    const multiline = element.localName === 'textarea';
    if (!multiline && element.localName !== 'input') return undefined;
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    if (!multiline && (input as HTMLInputElement).type === 'password') return undefined;
    const offset = input.selectionStart;
    if (offset === null || offset !== input.selectionEnd || !Number.isSafeInteger(offset) || offset < 0) return undefined;
    const value = input.value;
    if (offset > value.length) return undefined;
    const nativeRect = input.getBoundingClientRect(), style = view.getComputedStyle(input);
    if (nativeRect.width <= 0 || nativeRect.height <= 0 || style.visibility === 'hidden' || style.visibility === 'collapse') return undefined;
    const paddingX = pixels(style.paddingLeft) + pixels(style.paddingRight), paddingY = pixels(style.paddingTop) + pixels(style.paddingBottom);
    const contentWidth = input.clientWidth - paddingX, contentHeight = input.clientHeight - paddingY;
    if (contentWidth <= 0 || contentHeight <= 0) return undefined;
    const borderWidth = pixels(style.width) + (style.boxSizing === 'border-box' ? 0 : paddingX + pixels(style.borderLeftWidth) + pixels(style.borderRightWidth));
    const borderHeight = pixels(style.height) + (style.boxSizing === 'border-box' ? 0 : paddingY + pixels(style.borderTopWidth) + pixels(style.borderBottomWidth));
    const scaleX = nativeRect.width / (borderWidth || input.offsetWidth), scaleY = nativeRect.height / (borderHeight || input.offsetHeight);
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY) || scaleX <= 0 || scaleY <= 0) return undefined;
    const vertical = style.writingMode.startsWith('vertical') || style.writingMode.startsWith('sideways');
    mirror = document.createElement('div'); mirror.setAttribute('aria-hidden', 'true'); mirror.inert = true;
    mirror.lang = input.closest('[lang]')?.getAttribute('lang') ?? document.documentElement.lang;
    const set = (property: string, value: string): void => { mirror!.style.setProperty(property, value, 'important'); };
    set('all', 'initial');
    for (const property of typography) set(property, style.getPropertyValue(property));
    set('position', 'fixed'); set('left', '0'); set('top', '0'); set('visibility', 'hidden'); set('pointer-events', 'none');
    set('display', 'block'); set('box-sizing', 'content-box'); set('margin', '0'); set('border', '0'); set('padding', '0');
    set('overflow', 'visible'); set('content-visibility', 'visible'); set('transform', 'none');
    set('width', vertical ? 'max-content' : `${contentWidth}px`); set('height', vertical ? `${contentHeight}px` : 'auto');
    if (!multiline || (input as HTMLTextAreaElement).wrap === 'off') set('white-space', 'pre');
    else { set('white-space', 'pre-wrap'); set('overflow-wrap', 'break-word'); }
    // A zero-width final character supplies a line box for empty/trailing-newline carets.
    const node = document.createTextNode(value + '\u200b'); mirror.append(node); document.documentElement.append(mirror);
    const range = document.createRange(); range.setStart(node, offset); range.collapse(true);
    const caret = range.getClientRects()[0], box = mirror.getBoundingClientRect();
    if (!caret || !Number.isFinite(caret.left) || !Number.isFinite(caret.top) || !Number.isFinite(caret.width) || !Number.isFinite(caret.height)) return undefined;
    const mirrorScaleX = box.width / mirror.offsetWidth, mirrorScaleY = box.height / mirror.offsetHeight;
    if (!Number.isFinite(mirrorScaleX) || !Number.isFinite(mirrorScaleY) || mirrorScaleX <= 0 || mirrorScaleY <= 0) return undefined;
    let x = (caret.left - box.left) / mirrorScaleX, y = (caret.top - box.top) / mirrorScaleY;
    if (!multiline) {
      if (vertical) x += (contentWidth - box.width / mirrorScaleX) / 2;
      else y += (contentHeight - box.height / mirrorScaleY) / 2;
    } else if (vertical && !style.writingMode.endsWith('-lr')) x += contentWidth - box.width / mirrorScaleX;
    x += input.clientLeft + pixels(style.paddingLeft) - input.scrollLeft;
    y += input.clientTop + pixels(style.paddingTop) - input.scrollTop;
    const width = vertical ? caret.width / mirrorScaleX : 0, height = vertical ? 0 : caret.height / mirrorScaleY;
    if (width < 0 || height < 0 || (vertical ? width : height) <= 0) return undefined;
    if (x + width < input.clientLeft || x > input.clientLeft + input.clientWidth
      || y + height < input.clientTop || y > input.clientTop + input.clientHeight) return undefined;
    return Object.freeze({ x: nativeRect.left + x * scaleX, y: nativeRect.top + y * scaleY, width: width * scaleX, height: height * scaleY });
  } catch { return undefined; }
  finally { mirror?.remove(); }
}

/** Only the native reference is borrowed, never a Combobox's construction callbacks. */
export function textCaretAnchor(element: HTMLElement): () => PositionRect | undefined {
  return () => measureTextCaretRect(element);
}
