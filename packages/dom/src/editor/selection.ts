import { isTextCodeUnitBoundary } from '@sectile/core/text';
import type {
  InlinePoint,
  InlineSurface,
} from '@sectile/content/position';
import type { EditorSelection } from '@sectile/editor/selection';
import type { EditorDOMSelectionResult } from './contracts.js';
import {
  editorHardBreakSelector,
  editorInlineAtomSelector,
  editorInlineSurfaceSelector,
  editorIsolatedFrameID,
  editorIsolatedFrameSelector,
  readEditorInlineSurface,
} from './markers.js';

interface DOMBoundary {
  readonly node: Node;
  readonly offset: number;
}

export function readEditorDOMSelection(
  root: HTMLElement,
): EditorDOMSelectionResult {
  const selection = root.ownerDocument.defaultView?.getSelection();
  if (
    selection === undefined
    || selection === null
    || selection.rangeCount === 0
    || selection.anchorNode === null
    || selection.focusNode === null
  ) {
    return Object.freeze({ status: 'invalid' });
  }

  const anchor = domBoundaryToPoint(
    root,
    selection.anchorNode,
    selection.anchorOffset,
  );
  const focus = domBoundaryToPoint(
    root,
    selection.focusNode,
    selection.focusOffset,
  );
  if (anchor === null || focus === null) {
    return Object.freeze({ status: 'invalid' });
  }

  const anchorFrame = isolatedFrameOf(selection.anchorNode);
  const focusFrame = isolatedFrameOf(selection.focusNode);
  if (anchorFrame !== focusFrame) {
    return Object.freeze({ status: 'isolated' });
  }

  return Object.freeze({
    status: 'mapped',
    selection: Object.freeze({
      anchor,
      focus,
      direction: selectionDirection(
        root.ownerDocument,
        selection.anchorNode,
        selection.anchorOffset,
        selection.focusNode,
        selection.focusOffset,
      ),
    }),
  });
}

export function setEditorDOMSelection(
  root: HTMLElement,
  selection: EditorSelection | null,
): boolean {
  const native = root.ownerDocument.defaultView?.getSelection();
  if (native === undefined || native === null) return false;

  if (selection === null) {
    native.removeAllRanges();
    return true;
  }
  if (
    selection.anchor.type !== 'inline'
    || selection.focus.type !== 'inline'
  ) {
    return false;
  }

  const anchor = logicalPointToDOM(root, selection.anchor);
  const focus = logicalPointToDOM(root, selection.focus);
  if (anchor === null || focus === null) return false;

  const setBaseAndExtent = (
    native as Selection & {
      setBaseAndExtent?: (
        anchorNode: Node,
        anchorOffset: number,
        focusNode: Node,
        focusOffset: number,
      ) => void;
    }
  ).setBaseAndExtent;
  if (typeof setBaseAndExtent === 'function') {
    setBaseAndExtent.call(
      native,
      anchor.node,
      anchor.offset,
      focus.node,
      focus.offset,
    );
    return true;
  }

  const range = root.ownerDocument.createRange();
  const anchorBeforeFocus = compareBoundaries(
    root.ownerDocument,
    anchor,
    focus,
  ) <= 0;
  const start = anchorBeforeFocus ? anchor : focus;
  const end = anchorBeforeFocus ? focus : anchor;
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  native.removeAllRanges();
  native.addRange(range);
  return true;
}

export function logicalPointToDOM(
  root: HTMLElement,
  point: InlinePoint,
): DOMBoundary | null {
  const surface = findSurface(root, point.surface);
  if (surface === null) return null;
  return locateBoundary(surface, point.offset, surface);
}

export function domBoundaryToPoint(
  root: HTMLElement,
  node: Node,
  offset: number,
): InlinePoint | null {
  if (
    !Number.isSafeInteger(offset)
    || offset < 0
    || !containsNode(root, node)
  ) {
    return null;
  }

  if (closestElement(node, editorInlineAtomSelector()) !== null) {
    return null;
  }

  const surfaceElement = closestElement(
    node,
    editorInlineSurfaceSelector(),
  );
  if (surfaceElement === null || !root.contains(surfaceElement)) {
    return null;
  }
  const surface = readEditorInlineSurface(surfaceElement);
  if (surface === null) return null;

  const logicalOffset = offsetWithin(
    surfaceElement,
    node,
    offset,
    surfaceElement,
  );
  if (logicalOffset === null) return null;

  return Object.freeze({
    type: 'inline',
    surface,
    offset: logicalOffset,
    affinity: 'after',
  });
}

function findSurface(
  root: HTMLElement,
  surface: InlineSurface,
): HTMLElement | null {
  for (
    const candidate
    of root.querySelectorAll<HTMLElement>(editorInlineSurfaceSelector())
  ) {
    const value = readEditorInlineSurface(candidate);
    if (value !== null && sameSurface(value, surface)) return candidate;
  }
  return null;
}

function locateBoundary(
  container: Node,
  offset: number,
  owningSurface: Element,
): DOMBoundary | null {
  if (!Number.isSafeInteger(offset) || offset < 0) return null;

  let remaining = offset;
  const children = [...container.childNodes];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child === undefined) continue;

    if (remaining === 0) {
      return Object.freeze({
        node: container,
        offset: index,
      });
    }

    const length = measureDOMUnit(child, owningSurface);
    if (length === null) return null;

    if (remaining < length) {
      if (child.nodeType === 3) {
        const text = child.nodeValue ?? '';
        return (
          remaining <= text.length
          && isTextCodeUnitBoundary(text, remaining)
        )
          ? Object.freeze({
              node: child,
              offset: remaining,
            })
          : null;
      }
      if (isAtomicUnit(child)) return null;
      return locateBoundary(child, remaining, owningSurface);
    }

    if (remaining === length) {
      return Object.freeze({
        node: container,
        offset: index + 1,
      });
    }
    remaining -= length;
  }

  return remaining === 0
    ? Object.freeze({
        node: container,
        offset: children.length,
      })
    : null;
}

function offsetWithin(
  container: Node,
  target: Node,
  targetOffset: number,
  owningSurface: Element,
): number | null {
  if (container === target) {
    if (container.nodeType === 3) {
      const text = container.nodeValue ?? '';
      return (
        targetOffset <= text.length
        && isTextCodeUnitBoundary(text, targetOffset)
      )
        ? targetOffset
        : null;
    }

    const children = [...container.childNodes];
    if (targetOffset > children.length) return null;
    let total = 0;
    for (let index = 0; index < targetOffset; index += 1) {
      const child = children[index];
      if (child === undefined) continue;
      const measured = measureDOMUnit(child, owningSurface);
      if (measured === null) return null;
      total += measured;
    }
    return total;
  }

  if (container.nodeType === 3 || isAtomicUnit(container)) {
    return null;
  }

  let total = 0;
  for (const child of container.childNodes) {
    const measured = measureDOMUnit(child, owningSurface);
    if (measured === null) return null;

    if (containsNode(child, target)) {
      const nested = offsetWithin(
        child,
        target,
        targetOffset,
        owningSurface,
      );
      return nested === null ? null : total + nested;
    }
    total += measured;
  }
  return null;
}

function measureDOMUnit(
  node: Node,
  owningSurface: Element,
): number | null {
  if (node.nodeType === 3) return (node.nodeValue ?? '').length;

  const element = asElement(node);
  if (element !== null) {
    const nestedSurface = readEditorInlineSurface(element);
    if (nestedSurface !== null && element !== owningSurface) return null;
    if (isAtomicUnit(element)) return 1;
  }

  let total = 0;
  for (const child of node.childNodes) {
    const measured = measureDOMUnit(child, owningSurface);
    if (measured === null) return null;
    total += measured;
  }
  return total;
}

function isAtomicUnit(node: Node): boolean {
  const element = asElement(node);
  return (
    element !== null
    && (
      element.matches(editorInlineAtomSelector())
      || element.matches(editorHardBreakSelector())
    )
  );
}

function isolatedFrameOf(node: Node): string | null {
  const frame = closestElement(node, editorIsolatedFrameSelector());
  return frame === null ? null : editorIsolatedFrameID(frame);
}

function closestElement(
  node: Node,
  selector: string,
): Element | null {
  const element = asElement(node) ?? node.parentElement;
  return element?.closest(selector) ?? null;
}

function asElement(node: Node): Element | null {
  return node.nodeType === 1 ? node as Element : null;
}

function containsNode(
  container: Node,
  node: Node,
): boolean {
  return container === node || (
    'contains' in container
    && typeof container.contains === 'function'
    && container.contains(node)
  );
}

function sameSurface(
  left: InlineSurface,
  right: InlineSurface,
): boolean {
  return (
    left.type === right.type
    && left.id === right.id
    && (
      left.type === 'node'
      || (
        right.type === 'slot'
        && left.slot === right.slot
      )
    )
  );
}

function selectionDirection(
  document: Document,
  anchorNode: Node,
  anchorOffset: number,
  focusNode: Node,
  focusOffset: number,
): 'forward' | 'backward' {
  const anchor = Object.freeze({
    node: anchorNode,
    offset: anchorOffset,
  });
  const focus = Object.freeze({
    node: focusNode,
    offset: focusOffset,
  });
  return compareBoundaries(document, anchor, focus) <= 0
    ? 'forward'
    : 'backward';
}

function compareBoundaries(
  document: Document,
  left: DOMBoundary,
  right: DOMBoundary,
): number {
  const leftRange = document.createRange();
  leftRange.setStart(left.node, left.offset);
  leftRange.collapse(true);

  const rightRange = document.createRange();
  rightRange.setStart(right.node, right.offset);
  rightRange.collapse(true);

  return leftRange.compareBoundaryPoints(
    0,
    rightRange,
  );
}
