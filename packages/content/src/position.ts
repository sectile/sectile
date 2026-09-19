import type { NodeID, SlotName } from './document.js';
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
