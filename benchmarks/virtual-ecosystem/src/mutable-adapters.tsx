import { VirtualList } from '@sectile/vue/virtual/list';
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
  ITEM_COUNT, OVERSCAN_PX, OVERSCAN_ROWS, ROW_HEIGHT, VIEWPORT_HEIGHT, VIEWPORT_WIDTH, contentFor,
  type BenchmarkItem, type RowProfile,
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
  readonly sizeMode: DynamicSizeMode;
  readonly heightHandling: HeightHandling;
  mount(host: HTMLElement, items: readonly BenchmarkItem[], rowProfile: RowProfile): MutableMountedAdapter;
}

export type DynamicSizeMode = 'estimated' | 'automatic';

export interface HeightHandling {
  readonly sizeInput: 'dom-measurement' | 'application-size';
  readonly initialEstimate: boolean;
  readonly resizeNotification: 'automatic' | 'dependency-signal' | 'cache-invalidation';
  readonly applicationCalculatesHeight: boolean;
}

const estimatedHeightHandling: HeightHandling = Object.freeze({
  sizeInput: 'dom-measurement',
  initialEstimate: true,
  resizeNotification: 'automatic',
  applicationCalculatesHeight: false,
});

const automaticHeightHandling: HeightHandling = Object.freeze({
  sizeInput: 'dom-measurement',
  initialEstimate: false,
  resizeNotification: 'automatic',
  applicationCalculatesHeight: false,
});

const benchmarkItemKey = (item: BenchmarkItem): string => item.id;

const ReactVirtualizedListComponent = ReactVirtualizedList as unknown as ComponentType<Record<string, unknown>>;
const CellMeasurerComponent = CellMeasurer as unknown as ComponentType<Record<string, unknown>>;
const VListComponent = VList as unknown as ComponentType<Record<string, unknown>>;
const SectileList = VirtualList as unknown as Parameters<typeof h>[0];
const VueDynamicScroller = DynamicScroller as unknown as Parameters<typeof h>[0];
const VueDynamicScrollerItem = DynamicScrollerItem as unknown as Parameters<typeof h>[0];

interface MutableSnapshot {
  readonly items: readonly BenchmarkItem[];
  readonly rowProfile: RowProfile;
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

function createMutableStore(initialItems: readonly BenchmarkItem[], rowProfile: RowProfile): MutableStore {
  let snapshot: MutableSnapshot = Object.freeze({ items: initialItems, rowProfile, revision: 0, operation: null, location: null, changeIndex: 0 });
  const listeners = new Set<() => void>();
  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
    update(nextItems: readonly BenchmarkItem[], scenario: MutationScenario) {
      snapshot = Object.freeze({
        items: nextItems,
        rowProfile: snapshot.rowProfile,
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

function rowAttributes(item: BenchmarkItem, index: number, rowProfile: RowProfile, style: React.CSSProperties = {}): Record<string, unknown> {
  return {
    className: `bench-row bench-row--${rowProfile}`,
    'data-id': item.id,
    'data-index': index,
    style: rowProfile === 'uniform' ? { ...style, height: ROW_HEIGHT } : style,
  };
}

function reactRow(item: BenchmarkItem, index: number, rowProfile: RowProfile, style?: React.CSSProperties) {
  return createElement('div', rowAttributes(item, index, rowProfile, style), ...reactRowContent(item, rowProfile));
}

function reactRowContent(item: BenchmarkItem, rowProfile: RowProfile): readonly ReactElement[] {
  const content = contentFor(item);
  if (rowProfile === 'uniform') return [createElement('span', { key: 'title' }, content.title)];
  const children: ReactElement[] = [
    createElement('div', { className: 'bench-row__header', key: 'header' },
      createElement('strong', { className: 'bench-row__title' }, content.title),
      createElement('span', { className: 'bench-row__metadata' }, content.metadata)),
    createElement('p', { className: 'bench-row__summary', key: 'summary' }, content.summary),
  ];
  if (content.tags.length > 0) children.push(createElement('div', { className: 'bench-row__tags', key: 'tags' }, ...content.tags.map((tag, index) => createElement('span', { className: 'bench-row__tag', key: `${tag}-${index}` }, tag))));
  if (item.expanded) children.push(createElement('p', { className: 'bench-row__detail', key: 'detail' }, content.detail));
  return children;
}

function vueRowContent(item: BenchmarkItem, rowProfile: RowProfile) {
  const content = contentFor(item);
  if (rowProfile === 'uniform') return [h('span', content.title)];
  const children = [
    h('div', { class: 'bench-row__header' }, [
      h('strong', { class: 'bench-row__title' }, content.title),
      h('span', { class: 'bench-row__metadata' }, content.metadata),
    ]),
    h('p', { class: 'bench-row__summary' }, content.summary),
  ];
  if (content.tags.length > 0) children.push(h('div', { class: 'bench-row__tags' }, content.tags.map((tag) => h('span', { class: 'bench-row__tag' }, tag))));
  if (item.expanded) children.push(h('p', { class: 'bench-row__detail' }, content.detail));
  return children;
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
      ...rowAttributes(item, virtualItem.index, snapshot.rowProfile, {
        position: 'absolute', inset: '0 0 auto 0', transform: `translateY(${virtualItem.start}px)`, width: '100%',
      }),
      key: item.id,
      ref: virtualizer.measureElement,
    }, ...reactRowContent(item, snapshot.rowProfile));
  })));
}

interface ReactWindowRowData { readonly items: readonly BenchmarkItem[]; readonly rowProfile: RowProfile; }

function ReactWindowMutableRow({ index, style, items, rowProfile }: RowComponentProps<ReactWindowRowData>) {
  return reactRow(items[index]!, index, rowProfile, style);
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
    rowProps: { items: snapshot.items, rowProfile: snapshot.rowProfile },
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
    itemContent: (index, item) => reactRow(item, index, snapshot.rowProfile),
  });
}

function ReactVirtuosoAutomatic({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  return createElement(Virtuoso<BenchmarkItem>, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    data: snapshot.items,
    increaseViewportBy: OVERSCAN_PX,
    computeItemKey: (_index, item) => item.id,
    itemContent: (index, item) => reactRow(item, index, snapshot.rowProfile),
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
      }, reactRow(item, index, snapshot.rowProfile)),
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
    children: (item: BenchmarkItem, index: number) => reactRow(item, index, snapshot.rowProfile),
  });
}

function VirtuaAutomatic({ store }: { readonly store: MutableStore }) {
  const snapshot = useMutableSnapshot(store);
  const shift = snapshot.location === 'start' && (snapshot.operation === 'insert' || snapshot.operation === 'remove');
  return createElement(VListComponent, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    data: snapshot.items,
    bufferSize: OVERSCAN_PX,
    shift,
    children: (item: BenchmarkItem, index: number) => reactRow(item, index, snapshot.rowProfile),
  });
}

function mountMutableReact(
  host: HTMLElement,
  initialItems: readonly BenchmarkItem[],
  rowProfile: RowProfile,
  component: (props: { readonly store: MutableStore }) => ReactElement,
): MutableMountedAdapter {
  const store = createMutableStore(initialItems, rowProfile);
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
  heightHandling: HeightHandling = estimatedHeightHandling,
  sizeMode: DynamicSizeMode = 'estimated',
): MutableBenchmarkAdapter {
  return Object.freeze({
    name,
    version,
    stack: 'React 19.2.8',
    sizeMode,
    heightHandling,
    mount: (host: HTMLElement, initialItems: readonly BenchmarkItem[], rowProfile: RowProfile) => mountMutableReact(host, initialItems, rowProfile, component),
  });
}

function createSectileMutableAdapter(sizeMode: DynamicSizeMode): MutableBenchmarkAdapter {
  return Object.freeze({
  name: 'Sectile Virtual', version: '0.7.0', stack: 'Vue 3.5.22', sizeMode,
  heightHandling: sizeMode === 'estimated' ? estimatedHeightHandling : automaticHeightHandling,
  mount(host: HTMLElement, initialItems: readonly BenchmarkItem[], rowProfile: RowProfile) {
    const data = shallowRef(initialItems);
    const component = defineComponent({
      setup() {
        return () => h(SectileList, {
          items: data.value,
          getKey: benchmarkItemKey,
          ...(sizeMode === 'estimated' ? { estimateSize: ROW_HEIGHT } : {}),
          overscan: OVERSCAN_PX,
          maxItems: ITEM_COUNT + 1,
          initialViewport: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
          class: 'bench-scroller',
          style: { width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, overflow: 'auto' },
          itemAttributes: (item: BenchmarkItem, index: number) => ({
            class: `bench-row bench-row--${rowProfile}`,
            'data-id': item.id,
            'data-index': index,
            ...(rowProfile === 'uniform' ? { style: { height: `${ROW_HEIGHT}px` } } : {}),
          }),
        }, {
          default: ({ value }: { value: BenchmarkItem }) => vueRowContent(value, rowProfile),
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
      update(nextItems: readonly BenchmarkItem[], _scenario: MutationScenario) {
        data.value = nextItems;
      },
      unmount: () => app.unmount(),
    });
  },
  });
}

const sectileMutableAdapter = createSectileMutableAdapter('estimated');
const sectileAutomaticAdapter = createSectileMutableAdapter('automatic');

const vueVirtualScrollerMutableAdapter: MutableBenchmarkAdapter = Object.freeze({
  name: 'Vue Virtual Scroller', version: '3.0.5', stack: 'Vue 3.5.22',
  sizeMode: 'estimated', heightHandling: estimatedHeightHandling,
  mount(host: HTMLElement, initialItems: readonly BenchmarkItem[], rowProfile: RowProfile) {
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
              class: `bench-row bench-row--${rowProfile}`,
              'data-id': item.id,
              'data-index': index,
              ...(rowProfile === 'uniform' ? { style: { height: `${ROW_HEIGHT}px` } } : {}),
            }, vueRowContent(item, rowProfile)),
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
    ...estimatedHeightHandling,
    resizeNotification: 'cache-invalidation',
  })),
  reactMutableAdapter('Virtua', '0.50.5', VirtuaMutable),
  vueVirtualScrollerMutableAdapter,
]);

export const automaticMutableAdapters: readonly MutableBenchmarkAdapter[] = Object.freeze([
  sectileAutomaticAdapter,
  reactMutableAdapter(
    'React Virtuoso',
    '4.18.12',
    ReactVirtuosoAutomatic,
    automaticHeightHandling,
    'automatic',
  ),
  reactMutableAdapter(
    'Virtua',
    '0.50.5',
    VirtuaAutomatic,
    automaticHeightHandling,
    'automatic',
  ),
]);
