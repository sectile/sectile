import { h, shallowRef, type ShallowRef, type VNodeArrayChildren, type VNodeChild } from 'vue';
import { resolveVirtualLaneGeometry } from '@sectile/virtual/collection';
import type { VirtualInsets, VirtualLayoutPlan, VirtualPlacement, VirtualPoint, VirtualRect, VirtualScrollAlignment } from '@sectile/dom/virtual';
import { VirtualizerItem, type VirtualizerItemSize, type VirtualizerOperationResult, type VirtualizerRootExpose } from './virtual-core.js';
import type { PreparedVirtualList, VirtualListItemAttributes, VirtualListKeyResolver } from './virtual-collection-model.js';

export interface VirtualCollectionBaseProps<Value> {
  readonly items: readonly Value[];
  readonly getKey: VirtualListKeyResolver<Value>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly maxItems?: number;
  readonly initialViewport?: VirtualRect;
  readonly as?: string;
  readonly contentAs?: string;
  readonly itemAs?: string;
  readonly itemAttributes?: VirtualListItemAttributes<Value>;
}

export interface ResponsiveLaneProps {
  readonly laneCount?: number;
  readonly minLaneSize?: number;
  readonly maxLaneCount?: number;
  readonly laneGap?: number;
}

export interface VirtualCollectionExpose<State> {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
  readonly state: State;
  readonly plan: VirtualLayoutPlan<string> | null;
  scrollTo(id: string, alignment?: VirtualScrollAlignment): VirtualizerOperationResult<VirtualPoint> | undefined;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<string>> | undefined;
}

export interface ResponsiveLaneGeometry {
  readonly count: number;
  readonly extent: number;
}

export function resolveResponsiveLanes(
  crossExtent: number,
  requestedCount: number | undefined,
  minLaneSize: number,
  maxLaneCount: number,
  laneGap: number,
): ResponsiveLaneGeometry {
  const available = Number.isFinite(crossExtent) && crossExtent > 0
    ? crossExtent
    : minLaneSize;
  const geometry = resolveVirtualLaneGeometry(
    available,
    requestedCount === undefined
      ? Object.freeze({
          kind: 'responsive' as const,
          minExtent: minLaneSize,
          maxCount: maxLaneCount,
          gap: laneGap,
        })
      : Object.freeze({
          kind: 'fixed' as const,
          count: requestedCount,
          gap: laneGap,
        }),
  );
  return Object.freeze({
    count: geometry.count,
    extent: geometry.extent,
  });
}


export function renderHighLevelItems(
  scope: string,
  placements: readonly VirtualPlacement<string>[],
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  itemAs: string,
  itemAttributes: VirtualListItemAttributes<unknown> | undefined,
  size: VirtualizerItemSize,
  render: (value: unknown, key: string, index: number, placement: VirtualPlacement<string>) => VNodeChild,
  empty: (() => VNodeChild) | undefined,
): VNodeArrayChildren {
  if (prepared.domain.size === 0) {
    const child = empty?.();
    return child === undefined || child === null ? [] : [child];
  }
  return placements.flatMap((placement) => {
    const index = placement.index;
    if (index >= items.length || prepared.domain.at(index) !== placement.id) return [];
    const value = items[index];
    const attributes = itemAttributes?.(value, index) ?? {};
    return [h(VirtualizerItem, {
      ...attributes,
      key: placement.id,
      placement,
      size,
      as: itemAs,
      style: attributes['style'],
      'data-scope': scope,
      'data-virtual-layout': scope,
      'data-part': 'item',
    }, { default: () => render(value, placement.id, index, placement) })];
  }) as VNodeArrayChildren;
}

export function renderCollectionBootstrapItems(
  scope: string,
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  count: number,
  width: number,
  itemAs: string,
  itemAttributes: VirtualListItemAttributes<unknown> | undefined,
  render: (value: unknown, key: string, index: number, placement: VirtualPlacement<string>) => VNodeChild,
  itemRef: (index: number, value: unknown) => void,
): VNodeArrayChildren {
  return Array.from({ length: Math.min(count, prepared.domain.size) }, (_unused, index) => {
    const id = prepared.domain.at(index)!;
    const value = items[index];
    const attributes = itemAttributes?.(value, index) ?? {};
    const placement = Object.freeze({
      id,
      index,
      rect: Object.freeze({ x: index * width, y: 0, width, height: 0 }),
      visible: true,
    });
    const rendered = render(value, id, index, placement);
    const children = rendered === undefined || rendered === null
      ? []
      : Array.isArray(rendered)
        ? rendered
        : [rendered];
    return h(itemAs, {
      ...attributes,
      key: id,
      ref: (element: unknown) => itemRef(index, element),
      style: [attributes['style'], { width: `${width}px` }],
      'data-scope': scope,
      'data-virtual-layout': scope,
      'data-part': 'item',
      'data-index': index,
      'data-bootstrap': '',
    }, children as VNodeArrayChildren);
  });
}

export function createHighLevelVirtualExpose<State>(
  root: ShallowRef<VirtualizerRootExpose | undefined>,
  initialState: State,
): VirtualCollectionExpose<State> {
  const emptyRoot = shallowRef<HTMLElement | null>(null);
  return Object.freeze({
    get root() { return root.value?.scrollport ?? emptyRoot; },
    get state() { return (root.value?.state as State | undefined) ?? initialState; },
    get plan() { return root.value?.plan ?? null; },
    scrollTo: (id: string, alignment?: VirtualScrollAlignment) => root.value?.scrollTo(id, alignment),
    refresh: () => root.value?.refresh(),
    flush: () => root.value?.flush(),
  });
}

export function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}
