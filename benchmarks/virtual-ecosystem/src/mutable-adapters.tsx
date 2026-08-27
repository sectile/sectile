import { createSequence } from '@sectile/core/sequence';
import { createAxisMeasurementResolver, VirtualizerContent, VirtualizerItem, VirtualizerRoot } from '@sectile/vue/virtual';
import { createExtentIndex } from '@sectile/virtual/extent-index';
import { createLinearLayout, linearLayoutStrategy, type LinearPatch } from '@sectile/virtual/linear-layout';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createElement, useLayoutEffect, useRef, useSyncExternalStore, type ComponentType, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  CellMeasurer,
  CellMeasurerCache,
  List as ReactVirtualizedList,
  type ListRowProps,
} from 'react-virtualized';
import { Virtuoso } from 'react-virtuoso';
import { List as ReactWindowList, useDynamicRowHeight, type RowComponentProps } from 'react-window';
import { VList } from 'virtua';
import { createApp, defineComponent, h, shallowRef, type App } from 'vue';
import { DynamicScroller, DynamicScrollerItem } from 'vue-virtual-scroller';
import {
  ITEM_COUNT, OVERSCAN_PX, OVERSCAN_ROWS, ROW_HEIGHT, VIEWPORT_HEIGHT, VIEWPORT_WIDTH,
  type BenchmarkItem,
} from './constants.js';
import type { MutationLocation, MutationOperation, MutationScenario } from './mutations.js';

export interface MutableMountedAdapter {
  readonly scroller: HTMLElement;
  update(items: readonly BenchmarkItem[], scenario: MutationScenario): void;
  unmount(): void;
}

export interface MutableBenchmarkAdapter {
  readonly name: string;
  readonly version: string;
  readonly stack: string;
  readonly heightHandling: HeightHandling;
  mount(host: HTMLElement, items: readonly BenchmarkItem[]): MutableMountedAdapter;
}

export interface HeightHandling {
  readonly sizeInput: 'dom-measurement' | 'application-size';
  readonly initialEstimate: boolean;
  readonly resizeNotification: 'automatic' | 'dependency-signal' | 'cache-invalidation';
  readonly applicationCalculatesHeight: boolean;
}

const automaticHeightHandling: HeightHandling = Object.freeze({
  sizeInput: 'dom-measurement',
  initialEstimate: true,
  resizeNotification: 'automatic',
  applicationCalculatesHeight: false,
});

const ReactVirtualizedListComponent = ReactVirtualizedList as unknown as ComponentType<Record<string, unknown>>;
const CellMeasurerComponent = CellMeasurer as unknown as ComponentType<Record<string, unknown>>;
const VListComponent = VList as unknown as ComponentType<Record<string, unknown>>;
const SectileRoot = VirtualizerRoot as unknown as Parameters<typeof h>[0];
const SectileContent = VirtualizerContent as unknown as Parameters<typeof h>[0];
const SectileItem = VirtualizerItem as unknown as Parameters<typeof h>[0];
const VueDynamicScroller = DynamicScroller as unknown as Parameters<typeof h>[0];
const VueDynamicScrollerItem = DynamicScrollerItem as unknown as Parameters<typeof h>[0];

interface MutableSnapshot {
  readonly items: readonly BenchmarkItem[];
  readonly revision: number;
  readonly operation: MutationOperation | null;
  readonly location: MutationLocation | null;
  readonly changeIndex: number;
}

interface MutableStore {
  getSnapshot(): MutableSnapshot;
  subscribe(listener: () => void): () => void;
  update(items: readonly BenchmarkItem[], scenario: MutationScenario): void;
}

function createMutableStore(initialItems: readonly BenchmarkItem[]): MutableStore {
  let snapshot: MutableSnapshot = Object.freeze({ items: initialItems, revision: 0, operation: null, location: null, changeIndex: 0 });
  const listeners = new Set<() => void>();
  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    update(nextItems: readonly BenchmarkItem[], scenario: MutationScenario) {
      snapshot = Object.freeze({
        items: nextItems,
        revision: snapshot.revision + 1,
        operation: scenario.operation,
        location: scenario.location,
        changeIndex: scenario.index,
      });
      for (const listener of listeners) listener();
    },
  });
}

function useMutableSnapshot(store: MutableStore): MutableSnapshot {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function rowAttributes(item: BenchmarkItem, index: number, style: React.CSSProperties = {}): Record<string, unknown> {
  return {
    className: 'bench-row',
    'data-id': item.id,
    'data-index': index,
    style: { ...style, height: item.height },
  };
}

function reactRow(item: BenchmarkItem, index: number, style?: React.CSSProperties) {
  return createElement('div', rowAttributes(item, index, style), createElement('span', null, item.label));
}

function TanStackMutable({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: snapshot.items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => snapshot.items[index]?.id ?? index,
    overscan: OVERSCAN_ROWS,
  });
  return createElement('div', {
    ref: parentRef,
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, overflow: 'auto' },
  }, createElement('div', {
    style: { position: 'relative', width: '100%', height: virtualizer.getTotalSize() },
  }, virtualizer.getVirtualItems().map((virtualItem) => {
    const item = snapshot.items[virtualItem.index]!;
    return createElement('div', {
      ...rowAttributes(item, virtualItem.index, {
        position: 'absolute', inset: '0 0 auto 0', transform: `translateY(${virtualItem.start}px)`, width: '100%',
      }),
      key: item.id,
      ref: virtualizer.measureElement,
    }, createElement('span', null, item.label));
  })));
}

interface ReactWindowRowData { readonly items: readonly BenchmarkItem[]; }

function ReactWindowMutableRow({ index, style, items }: RowComponentProps<ReactWindowRowData>) {
  return reactRow(items[index]!, index, style);
}

function ReactWindowMutable({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  const rowHeight = useDynamicRowHeight({ defaultRowHeight: ROW_HEIGHT });
  return createElement(ReactWindowList<ReactWindowRowData>, {
    className: 'bench-scroller',
    rowComponent: ReactWindowMutableRow,
    rowCount: snapshot.items.length,
    rowHeight,
    rowKey: (index, data) => data.items[index]!.id,
    rowProps: { items: snapshot.items },
    overscanCount: OVERSCAN_ROWS,
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });
}

function ReactVirtuosoMutable({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  return createElement(Virtuoso<BenchmarkItem>, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    data: snapshot.items,
    defaultItemHeight: ROW_HEIGHT,
    increaseViewportBy: OVERSCAN_PX,
    computeItemKey: (_index, item) => item.id,
    itemContent: (index, item) => reactRow(item, index),
  });
}

function ReactVirtualizedMutable({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  const listRef = useRef<ReactVirtualizedList>(null);
  const cacheRef = useRef(new CellMeasurerCache({
    defaultHeight: ROW_HEIGHT,
    fixedWidth: true,
    keyMapper: (rowIndex) => store.getSnapshot().items[rowIndex]?.id ?? rowIndex,
  }));
  useLayoutEffect(() => {
    if (snapshot.operation === 'resize') cacheRef.current.clear(snapshot.changeIndex, 0);
    listRef.current?.recomputeRowHeights(snapshot.changeIndex);
    listRef.current?.forceUpdateGrid();
  }, [snapshot.revision, snapshot.changeIndex, snapshot.operation]);
  const rowRenderer = ({ index, key, style, parent }: ListRowProps) => {
    const item = snapshot.items[index]!;
    return createElement(CellMeasurerComponent, {
      cache: cacheRef.current,
      columnIndex: 0,
      key,
      parent,
      rowIndex: index,
      children: ({ registerChild }: { readonly registerChild: (element?: Element | null) => void }) => createElement('div', {
        ref: registerChild,
        style,
      }, reactRow(item, index)),
    });
  };
  return createElement(ReactVirtualizedListComponent, {
    ref: listRef,
    className: 'bench-scroller',
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    rowCount: snapshot.items.length,
    deferredMeasurementCache: cacheRef.current,
    estimatedRowSize: ROW_HEIGHT,
    rowHeight: cacheRef.current.rowHeight,
    rowRenderer,
    overscanRowCount: OVERSCAN_ROWS,
  });
}

function VirtuaMutable({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  const shift = snapshot.location === 'start' && (snapshot.operation === 'insert' || snapshot.operation === 'remove');
  return createElement(VListComponent, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    data: snapshot.items,
    itemSize: ROW_HEIGHT,
    bufferSize: OVERSCAN_PX,
    shift,
    children: (item: BenchmarkItem, index: number) => reactRow(item, index),
  });
}

function mountMutableReact(
  host: HTMLElement,
  initialItems: readonly BenchmarkItem[],
  component: (props: { readonly store: MutableStore }) => ReactElement,
): MutableMountedAdapter {
  const store = createMutableStore(initialItems);
  const root: Root = createRoot(host);
  root.render(createElement(component, { store }));
  return Object.freeze({
    get scroller() {
      const element = host.querySelector<HTMLElement>('.bench-scroller');
      if (element === null) throw new Error('Mutable React adapter did not create .bench-scroller.');
      return element;
    },
    update: (nextItems: readonly BenchmarkItem[], scenario: MutationScenario) => store.update(nextItems, scenario),
    unmount: () => root.unmount(),
  });
}

function reactMutableAdapter(
  name: string,
  version: string,
  component: (props: { readonly store: MutableStore }) => ReactElement,
  heightHandling: HeightHandling = automaticHeightHandling,
): MutableBenchmarkAdapter {
  return Object.freeze({
    name,
    version,
    stack: 'React 19.2.8',
    heightHandling,
    mount: (host: HTMLElement, initialItems: readonly BenchmarkItem[]) => mountMutableReact(host, initialItems, component),
  });
}

const sectileMutableAdapter: MutableBenchmarkAdapter = Object.freeze({
  name: 'Sectile Virtual', version: '0.7.0', stack: 'Vue 3.5.22', heightHandling: automaticHeightHandling,
  mount(host: HTMLElement, initialItems: readonly BenchmarkItem[]) {
    const data = shallowRef(initialItems);
    const mutateLayout = shallowRef<(mutation: LinearPatch<string>) => unknown>();
    const state = createLinearLayout(
      createSequence(initialItems.map((item) => item.id), { maxItems: ITEM_COUNT + 1 }),
      createExtentIndex(initialItems.map(() => Object.freeze({ kind: 'unknown' as const, fallback: ROW_HEIGHT })), { maxItems: ITEM_COUNT + 1 }),
      { crossExtent: VIEWPORT_WIDTH },
    );
    const measure = createAxisMeasurementResolver('vertical');
    const component = defineComponent({
      setup() {
        return () => h(SectileRoot, {
          defaultState: state,
          strategy: linearLayoutStrategy,
          measure,
          overscan: OVERSCAN_PX,
          initialViewport: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
          class: 'bench-scroller',
          style: { width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, overflow: 'auto' },
        }, {
          default: ({ placements, mutate }: { placements: readonly { id: string; index: number; rect: { x: number; y: number; width: number; height: number }; visible: boolean }[]; mutate: (mutation: LinearPatch<string>) => unknown }) => {
            mutateLayout.value = mutate;
            const byID = new Map(data.value.map((item) => [item.id, item]));
            return h(SectileContent, null, {
              default: () => placements.map((placement) => {
                const item = byID.get(placement.id)!;
                return h(SectileItem, {
                  key: placement.id,
                  placement,
                  size: 'width',
                  class: 'bench-row',
                  'data-id': item.id,
                  style: { height: `${item.height}px` },
                }, { default: () => h('span', item.label) });
              }),
            });
          },
        });
      },
    });
    const app: App = createApp(component);
    app.mount(host);
    return Object.freeze({
      get scroller() {
        const element = host.querySelector<HTMLElement>('.bench-scroller');
        if (element === null) throw new Error('Mutable Sectile adapter did not create .bench-scroller.');
        return element;
      },
      update(nextItems: readonly BenchmarkItem[], scenario: MutationScenario) {
        data.value = nextItems;
        if (scenario.operation === 'resize') return;
        const mutation: LinearPatch<string> = scenario.operation === 'move'
          ? { patch: { type: 'move', from: scenario.location === 'end' ? scenario.index + 1 : scenario.index, to: scenario.location === 'end' ? scenario.index : scenario.index + 1, count: 1 } }
          : {
              patch: {
                type: 'splice',
                index: scenario.index,
                deleteCount: scenario.operation === 'remove' ? 1 : 0,
                inserted: scenario.operation === 'insert' ? [scenario.nextItems[scenario.index]!.id] : [],
              },
              ...(scenario.operation === 'insert' ? { insertedExtents: [{ kind: 'exact', value: ROW_HEIGHT }] as const } : {}),
            };
        mutateLayout.value?.(mutation);
      },
      unmount: () => app.unmount(),
    });
  },
});

const vueVirtualScrollerMutableAdapter: MutableBenchmarkAdapter = Object.freeze({
  name: 'Vue Virtual Scroller', version: '3.0.5', stack: 'Vue 3.5.22',
  heightHandling: automaticHeightHandling,
  mount(host: HTMLElement, initialItems: readonly BenchmarkItem[]) {
    const data = shallowRef(initialItems);
    const shift = shallowRef(false);
    const component = defineComponent({
      setup() {
        return () => h(VueDynamicScroller, {
          class: 'bench-scroller',
          style: { width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, overflow: 'auto' },
          items: data.value as BenchmarkItem[],
          minItemSize: ROW_HEIGHT,
          keyField: 'id',
          shift: shift.value,
        }, {
          default: ({ item, index, active }: { item: BenchmarkItem; index: number; active: boolean }) => h(VueDynamicScrollerItem, {
            item,
            index,
            active,
          }, {
            default: () => h('div', {
              class: 'bench-row', 'data-id': item.id, 'data-index': index, style: { height: `${item.height}px` },
            }, [h('span', item.label)]),
          }),
        });
      },
    });
    const app: App = createApp(component);
    app.mount(host);
    return Object.freeze({
      get scroller() {
        const element = host.querySelector<HTMLElement>('.bench-scroller');
        if (element === null) throw new Error('Mutable Vue Virtual Scroller adapter did not create .bench-scroller.');
        return element;
      },
      update(nextItems: readonly BenchmarkItem[], scenario: MutationScenario) {
        shift.value = scenario.location === 'start' && (scenario.operation === 'insert' || scenario.operation === 'remove');
        data.value = nextItems;
      },
      unmount: () => app.unmount(),
    });
  },
});

export const mutableAdapters: readonly MutableBenchmarkAdapter[] = Object.freeze([
  sectileMutableAdapter,
  reactMutableAdapter('TanStack Virtual', '3.14.10', TanStackMutable),
  reactMutableAdapter('react-window', '2.3.0', ReactWindowMutable),
  reactMutableAdapter('React Virtuoso', '4.18.12', ReactVirtuosoMutable),
  reactMutableAdapter('react-virtualized', '9.22.6', ReactVirtualizedMutable, Object.freeze({
    ...automaticHeightHandling,
    resizeNotification: 'cache-invalidation',
  })),
  reactMutableAdapter('Virtua', '0.50.5', VirtuaMutable),
  vueVirtualScrollerMutableAdapter,
]);
