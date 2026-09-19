import { isTextCodeUnitBoundary } from '@sectile/core/text';
import type { InlineNode, NodeID, SlotName } from './document.js';
import type { ContentContainerTarget } from './query.js';

export type PositionAffinity = 'before' | 'after';

export type InlineSurface =
  | { readonly type: 'node'; readonly id: NodeID }
  | {
      readonly type: 'slot';
      readonly id: NodeID;
      readonly slot: SlotName;
    };

export interface InlinePoint {
  readonly type: 'inline';
  readonly surface: InlineSurface;
  readonly offset: number;
  readonly affinity: PositionAffinity;
}

export interface StructuralPoint {
  readonly type: 'structural';
  readonly container: ContentContainerTarget;
  readonly index: number;
  readonly affinity: PositionAffinity;
}

export type LogicalPoint = InlinePoint | StructuralPoint;

export type MappedPoint =
  | { readonly status: 'mapped'; readonly point: LogicalPoint }
  | { readonly status: 'lost'; readonly reason: string };

export type MappedNodeID =
  | { readonly status: 'mapped'; readonly id: NodeID }
  | { readonly status: 'lost'; readonly reason: string };

export interface ContentChangeMap {
  mapPoint(point: LogicalPoint): MappedPoint;
  mapNodeID(id: NodeID): MappedNodeID;
}

/**
 * Returns whether an inline-surface content offset is a legal logical point.
 *
 * Text contributes UTF-16 code units while hard breaks and inline atoms are
 * indivisible one-unit values. Surrogate-pair interiors are never boundaries.
 */
export function isInlineContentBoundary(
  nodes: readonly InlineNode[],
  offset: number,
): boolean {
  if (!Number.isSafeInteger(offset) || offset < 0) return false;

  let cursor = 0;
  if (offset === 0) return true;

  for (const node of nodes) {
    if (node.type === 'text') {
      const end = cursor + node.text.length;
      if (offset <= end) {
        return isTextCodeUnitBoundary(node.text, offset - cursor);
      }
      cursor = end;
      continue;
    }

    const end = cursor + 1;
    if (offset <= end) return offset === cursor || offset === end;
    cursor = end;
  }

  return offset === cursor;
}
