import { h, shallowRef, type ShallowRef, type VNodeArrayChildren, type VNodeChild } from 'vue';
import type { VirtualInsets, VirtualLayoutPlan, VirtualPlacement, VirtualRect, VirtualScrollAlignment, VirtualizerConnection } from '@sectile/dom/virtual';
import { VirtualizerItem, type VirtualizerItemSize, type VirtualizerRootExpose } from './virtual-core.js';
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
  scrollTo(id: string, alignment?: VirtualScrollAlignment): ReturnType<VirtualizerConnection<object, string, unknown, unknown>['scrollTo']> | undefined;
  refresh(): void;
  flush(): ReturnType<VirtualizerConnection<object, string, unknown, unknown>['flush']> | undefined;
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
  if (!Number.isFinite(minLaneSize) || minLaneSize <= 0)
    throw new TypeError('minLaneSize must be a positive finite number.');
  if (!Number.isSafeInteger(maxLaneCount) || maxLaneCount < 1)
    throw new TypeError('maxLaneCount must be a positive safe integer.');
  if (!Number.isFinite(laneGap) || laneGap < 0)
    throw new TypeError('laneGap must be a non-negative finite number.');
  if (requestedCount !== undefined && (!Number.isSafeInteger(requestedCount) || requestedCount < 1))
    throw new TypeError('laneCount must be a positive safe integer.');
  const available = Number.isFinite(crossExtent) && crossExtent > 0 ? crossExtent : minLaneSize;
  const count = requestedCount ?? Math.max(
    1,
    Math.min(maxLaneCount, Math.floor((available + laneGap) / (minLaneSize + laneGap))),
  );
  return Object.freeze({
    count,
    extent: Math.max(1, (available - laneGap * (count - 1)) / count),
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
    get root() { return root.value?.root ?? emptyRoot; },
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
