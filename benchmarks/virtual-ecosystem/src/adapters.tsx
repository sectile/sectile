import { VirtualList } from '@sectile/vue/virtual/list';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createElement, useRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { List as ReactVirtualizedList, type ListRowProps } from 'react-virtualized';
import { Virtuoso } from 'react-virtuoso';
import { List as ReactWindowList, type RowComponentProps } from 'react-window';
import { VList } from 'virtua';
import { createApp, defineComponent, h, type App } from 'vue';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import {
  ITEM_COUNT, items, OVERSCAN_PX, OVERSCAN_ROWS, ROW_HEIGHT, VIEWPORT_HEIGHT, VIEWPORT_WIDTH, contentFor,
  type BenchmarkItem,
} from './constants.js';

const ReactVirtualizedListComponent = ReactVirtualizedList as unknown as React.ComponentType<Record<string, unknown>>;
const VListComponent = VList as unknown as React.ComponentType<Record<string, unknown>>;
const SectileList = VirtualList as unknown as Parameters<typeof h>[0];
const VueRecycleScroller = RecycleScroller as unknown as Parameters<typeof h>[0];
const mutableItems = [...items];
const benchmarkItemKey = (item: BenchmarkItem): string => item.id;

export interface MountedAdapter {
  readonly scroller: HTMLElement;
  readonly unmount: () => void;
}

export interface BenchmarkAdapter {
  readonly name: string;
  readonly version: string;
  readonly stack: string;
  readonly mount: (host: HTMLElement) => MountedAdapter;
}

function rowText(index: number): string {
  const item = items[index];
  return item === undefined ? `Customer request ${index}` : contentFor(item).title;
}

function reactRow(index: number, style?: React.CSSProperties) {
  return createElement('div', {
    className: 'bench-row',
    'data-index': index,
    style: { ...style, height: ROW_HEIGHT },
  }, createElement('span', null, rowText(index)));
}

function mountReact(host: HTMLElement, element: React.ReactElement): { readonly root: Root; readonly scroller: HTMLElement } {
  const root = createRoot(host);
  root.render(element);
  return {
    root,
    get scroller() {
      const element = host.querySelector<HTMLElement>('.bench-scroller');
      if (element === null) throw new Error('React adapter did not create .bench-scroller.');
      return element;
    },
  };
}

function TanStackList() {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: ITEM_COUNT,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN_ROWS,
  });
  return createElement('div', {
    ref: parentRef,
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, overflow: 'auto' },
  }, createElement('div', {
    style: { position: 'relative', width: '100%', height: virtualizer.getTotalSize() },
  }, virtualizer.getVirtualItems().map((item) => reactRow(item.index, {
    position: 'absolute',
    inset: '0 0 auto 0',
    transform: `translateY(${item.start}px)`,
    width: '100%',
  }))));
}

function ReactWindowRow({ index, style }: RowComponentProps<Record<string, never>>) {
  return reactRow(index, style);
}

function ReactWindowApp() {
  return createElement(ReactWindowList<Record<string, never>>, {
    className: 'bench-scroller',
    rowComponent: ReactWindowRow,
    rowCount: ITEM_COUNT,
    rowHeight: ROW_HEIGHT,
    rowProps: {},
    overscanCount: OVERSCAN_ROWS,
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
  });
}

function ReactVirtuosoApp() {
  return createElement(Virtuoso, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    totalCount: ITEM_COUNT,
    fixedItemHeight: ROW_HEIGHT,
    increaseViewportBy: OVERSCAN_PX,
    itemContent: (index: number) => reactRow(index),
  });
}

function ReactVirtualizedRow({ index, key, style }: ListRowProps) {
  return createElement('div', {
    key,
    className: 'bench-row',
    'data-index': index,
    style: { ...style, height: ROW_HEIGHT },
  }, createElement('span', null, rowText(index)));
}

function ReactVirtualizedApp() {
  return createElement(ReactVirtualizedListComponent, {
    className: 'bench-scroller',
    width: VIEWPORT_WIDTH,
    height: VIEWPORT_HEIGHT,
    rowCount: ITEM_COUNT,
    rowHeight: ROW_HEIGHT,
    overscanRowCount: OVERSCAN_ROWS,
    rowRenderer: ReactVirtualizedRow,
  });
}

function VirtuaApp() {
  return createElement(VListComponent, {
    className: 'bench-scroller',
    style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    data: items,
    itemSize: ROW_HEIGHT,
    bufferSize: OVERSCAN_PX,
    children: (item: BenchmarkItem) => createElement('div', {
      className: 'bench-row',
      'data-index': item.index,
      style: { height: ROW_HEIGHT },
  }, createElement('span', null, contentFor(item).title)),
  });
}

function reactAdapter(name: string, version: string, element: React.ReactElement): BenchmarkAdapter {
  return Object.freeze({
    name,
    version,
    stack: 'React 19.2.8',
    mount(host: HTMLElement) {
      const mounted = mountReact(host, element);
      return Object.freeze({
        get scroller() { return mounted.scroller; },
        unmount: () => mounted.root.unmount(),
      });
    },
  });
}

const sectileAdapter: BenchmarkAdapter = Object.freeze({
  name: 'Sectile Virtual',
  version: '0.7.0',
  stack: 'Vue 3.5.22',
  mount(host: HTMLElement) {
    const component = defineComponent({
      setup() {
        return () => h(SectileList, {
          items,
          getKey: benchmarkItemKey,
          itemSize: ROW_HEIGHT,
          overscan: OVERSCAN_PX,
          initialViewport: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
          class: 'bench-scroller',
          style: { width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px`, overflow: 'auto' },
          itemAttributes: (_item: BenchmarkItem, index: number) => ({
            class: 'bench-row',
            'data-index': index,
            style: { height: `${ROW_HEIGHT}px` },
          }),
        }, {
          default: ({ value }: { value: BenchmarkItem }) => h('span', contentFor(value).title),
        });
      },
    });
    const app: App = createApp(component);
    app.mount(host);
    const scroller = host.querySelector<HTMLElement>('.bench-scroller');
    if (scroller === null) throw new Error('Sectile adapter did not create .bench-scroller.');
    return Object.freeze({ scroller, unmount: () => app.unmount() });
  },
});

const vueVirtualScrollerAdapter: BenchmarkAdapter = Object.freeze({
  name: 'Vue Virtual Scroller',
  version: '3.0.5',
  stack: 'Vue 3.5.22',
  mount(host: HTMLElement) {
    const component = defineComponent({
      setup() {
        return () => h(VueRecycleScroller, {
          class: 'bench-scroller',
          style: { width: `${VIEWPORT_WIDTH}px`, height: `${VIEWPORT_HEIGHT}px` },
          items: mutableItems,
          itemSize: ROW_HEIGHT,
          keyField: 'id',
          buffer: OVERSCAN_PX,
        }, {
          default: ({ item }: { item: BenchmarkItem }) => h('div', {
            class: 'bench-row',
            'data-index': item.index,
            style: { height: `${ROW_HEIGHT}px` },
          }, [h('span', contentFor(item).title)]),
        });
      },
    });
    const app: App = createApp(component);
    app.mount(host);
    const scroller = host.querySelector<HTMLElement>('.bench-scroller');
    if (scroller === null) throw new Error('Vue Virtual Scroller adapter did not create .bench-scroller.');
    return Object.freeze({ scroller, unmount: () => app.unmount() });
  },
});

export const fixedAdapters: readonly BenchmarkAdapter[] = Object.freeze([
  sectileAdapter,
  reactAdapter('TanStack Virtual', '3.14.10', createElement(TanStackList)),
  reactAdapter('react-window', '2.3.0', createElement(ReactWindowApp)),
  reactAdapter('React Virtuoso', '4.18.12', createElement(ReactVirtuosoApp)),
  reactAdapter('react-virtualized', '9.22.6', createElement(ReactVirtualizedApp)),
  reactAdapter('Virtua', '0.50.5', createElement(VirtuaApp)),
  vueVirtualScrollerAdapter,
]);

/** @deprecated Use fixedAdapters to make the height condition explicit. */
export const adapters = fixedAdapters;
