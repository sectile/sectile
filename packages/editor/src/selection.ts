import { failResult, okResult, type Result } from '@sectile/core/result';
import type {
  IDBearingNode,
  PortableContentDocument,
} from '@sectile/content/document';
import type { ContentErrorCode } from '@sectile/content/error';
import {
  isInlineContentBoundary,
  type ContentChangeMap,
  type LogicalPoint,
} from '@sectile/content/position';
import {
  allowedChildren,
  type DocumentIndex,
} from '@sectile/content/query';
import type { CompiledContentSchema } from '@sectile/content/schema';
import type { EditorErrorCode } from './error.js';

export type EditorSelectionDirection = 'forward' | 'backward';

export interface EditorSelection {
  readonly anchor: LogicalPoint;
  readonly focus: LogicalPoint;
  readonly direction: EditorSelectionDirection;
}

export function createCollapsedSelection(
  point: LogicalPoint,
): EditorSelection {
  return Object.freeze({
    anchor: point,
    focus: point,
    direction: 'forward',
  });
}

export function isCollapsedSelection(
  selection: EditorSelection,
): boolean {
  return sameLogicalPoint(selection.anchor, selection.focus);
}

export function sameEditorSelection(
  left: EditorSelection | null,
  right: EditorSelection | null,
): boolean {
  return left === right || (
    left !== null
    && right !== null
    && left.direction === right.direction
    && sameLogicalPoint(left.anchor, right.anchor)
    && sameLogicalPoint(left.focus, right.focus)
  );
}

export function mapEditorSelection(
  selection: EditorSelection | null,
  change: ContentChangeMap,
): EditorSelection | null {
  if (selection === null) return null;
  const anchor = change.mapPoint(selection.anchor);
  const focus = change.mapPoint(selection.focus);
  if (anchor.status === 'lost' || focus.status === 'lost') return null;
  return Object.freeze({
    anchor: anchor.point,
    focus: focus.point,
    direction: selection.direction,
  });
}

export function validateEditorSelection(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  selection: EditorSelection | null,
  index: DocumentIndex,
): Result<EditorSelection | null, EditorErrorCode | ContentErrorCode> {
  if (selection === null) return okResult(null);
  if (
    selection.direction !== 'forward'
    && selection.direction !== 'backward'
  ) {
    return selectionFailure('Selection direction is invalid.');
  }

  const anchor = validateLogicalPoint(
    document,
    schema,
    selection.anchor,
    index,
  );
  if (!anchor.ok) return anchor;
  const focus = validateLogicalPoint(
    document,
    schema,
    selection.focus,
    index,
  );
  if (!focus.ok) return focus;
  return okResult(selection);
}

function validateLogicalPoint(
  document: PortableContentDocument,
  schema: CompiledContentSchema,
  point: LogicalPoint,
  index: DocumentIndex,
): Result<true, EditorErrorCode | ContentErrorCode> {
  if (
    point.affinity !== 'before'
    && point.affinity !== 'after'
  ) {
    return selectionFailure('Selection affinity is invalid.');
  }

  if (point.type === 'structural') {
    if (!Number.isSafeInteger(point.index) || point.index < 0) {
      return selectionFailure('Structural selection index is invalid.');
    }
    const children = allowedChildren(document, {
      schema,
      target: point.container,
      index,
    });
    if (!children.ok) return children;
    if (children.value.kind !== 'block') {
      return selectionFailure(
        'Structural selection requires a block-content container.',
      );
    }
    return point.index <= children.value.count
      ? okResult(true)
      : selectionFailure('Structural selection index exceeds its container.');
  }

  if (!Number.isSafeInteger(point.offset) || point.offset < 0) {
    return selectionFailure('Inline selection offset is invalid.');
  }

  const node = index.getNode(point.surface.id);
  if (node === null) {
    return selectionFailure('Inline selection surface does not exist.');
  }
  const inline = inlineChildren(node, point);
  if (inline === null) {
    return selectionFailure('Inline selection surface is invalid.');
  }

  return isInlineContentBoundary(inline, point.offset)
    ? okResult(true)
    : selectionFailure('Inline selection offset is not a valid content boundary.');
}

function inlineChildren(
  node: IDBearingNode,
  point: Extract<LogicalPoint, { readonly type: 'inline' }>,
) {
  if (point.surface.type === 'node') {
    return node.type === 'paragraph' || node.type === 'heading'
      ? node.children
      : null;
  }
  if (node.type !== 'component' || node.kind !== 'block') return null;
  const slotName = point.surface.slot;
  const slot = node.slots.find(
    (candidate) => candidate.name === slotName,
  );
  return slot?.kind === 'inline' ? slot.content : null;
}

function sameLogicalPoint(
  left: LogicalPoint,
  right: LogicalPoint,
): boolean {
  if (left.type !== right.type || left.affinity !== right.affinity) {
    return false;
  }

  if (left.type === 'structural') {
    if (right.type !== 'structural') return false;
    return (
      left.index === right.index
      && sameContainer(left.container, right.container)
    );
  }

  if (right.type !== 'inline') return false;
  if (left.offset !== right.offset) return false;
  if (
    left.surface.type !== right.surface.type
    || left.surface.id !== right.surface.id
  ) {
    return false;
  }
  return (
    left.surface.type === 'node'
    || (
      right.surface.type === 'slot'
      && left.surface.slot === right.surface.slot
    )
  );
}

function sameContainer(
  left: Extract<LogicalPoint, { readonly type: 'structural' }>['container'],
  right: Extract<LogicalPoint, { readonly type: 'structural' }>['container'],
): boolean {
  if (left.type !== right.type) return false;
  if (left.type === 'root') return true;
  if (right.type === 'root') return false;
  return (
    left.id === right.id
    && (left.slot ?? null) === (right.slot ?? null)
  );
}

function selectionFailure<T>(
  message: string,
): Result<T, EditorErrorCode> {
  return failResult(
    'transition-rejection',
    'editor-selection-invalid',
    message,
  );
}
