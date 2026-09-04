import { VirtualGrid } from '@sectile/vue/virtual/grid';
import { VirtualMasonry } from '@sectile/vue/virtual/masonry';
import { VirtualSpatial } from '@sectile/vue/virtual/spatial';
import { useVirtualizer as useVueVirtualizer } from '@sectile/vue/virtual/core';
import { createExtentIndex } from '@sectile/virtual/extent-index';
import { createDenseTrackGridLayout, trackGridLayoutStrategy } from '@sectile/virtual/track-grid-layout';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  createElement,
  forwardRef,
  useRef,
  useSyncExternalStore,
  type ComponentType,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
} from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { VirtuosoGrid, type GridComponents } from 'react-virtuoso';
import {
  Grid as ReactWindowGrid,
  type CellComponentProps,
} from 'react-window';
import { experimental_VGrid as VirtuaGrid } from 'virtua';
import {
  createApp,
  defineComponent,
  h,
  onBeforeUnmount,
  shallowRef,
  type App,
} from 'vue';
import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './constants.js';
import type { BenchmarkCapability } from './families.js';
import {
  layoutAdapterItems,
  type LayoutBenchmarkFamily,
  type LayoutBenchmarkFixture,
  type LayoutBenchmarkItem,
  type LayoutFixtureProfile,
  type LayoutMutationScenario,
} from './layout-fixtures.js';
import type { LayoutValidationMode } from './layout-validation.js';
import { sectileVirtualVersion } from './package-versions.js';

export type LayoutSizeMode = 'fixed' | 'estimated' | 'automatic' | 'positioned';

export interface MountedLayoutAdapter {
  readonly scroller: HTMLElement;
  update(fixture: LayoutBenchmarkFixture): void;
  unmount(): void;
}

export interface LayoutBenchmarkAdapter {
  readonly family: LayoutBenchmarkFamily;
  readonly name: string;
  readonly version: string;
  readonly stack: string;
  readonly mode: LayoutSizeMode;
  readonly fixtureProfile: LayoutFixtureProfile;
  readonly validationMode: LayoutValidationMode;
  readonly mutationOperations: readonly LayoutMutationScenario['operation'][];
  mount(host: HTMLElement, fixture: LayoutBenchmarkFixture): MountedLayoutAdapter;
}

interface FixtureStore {
  getSnapshot(): LayoutBenchmarkFixture;
  subscribe(listener: () => void): () => void;
  update(fixture: LayoutBenchmarkFixture): void;
}

const SectileGrid = VirtualGrid as unknown as Parameters<typeof h>[0];
const SectileMasonry = VirtualMasonry as unknown as Parameters<typeof h>[0];
const SectileSpatial = VirtualSpatial as unknown as Parameters<typeof h>[0];
const ReactVirtuosoGrid = VirtuosoGrid as unknown as ComponentType<Record<string, unknown>>;
const ReactWindowGridComponent = ReactWindowGrid as unknown as ComponentType<Record<string, unknown>>;
const VirtuaGridComponent = VirtuaGrid as unknown as ComponentType<Record<string, unknown>>;
const allMutations = Object.freeze(['insert', 'move', 'remove', 'resize'] as const);
const structuralMutations = Object.freeze(['insert', 'move', 'remove'] as const);

export const layoutAdapters: readonly LayoutBenchmarkAdapter[] = Object.freeze([
  createSectileCollectionAdapter('flow-grid', 'fixed'),
  createSectileCollectionAdapter('flow-grid', 'estimated'),
  createSectileCollectionAdapter('flow-grid', 'automatic'),
  createReactVirtuosoGridAdapter(),
  createSectileCollectionAdapter('masonry', 'fixed'),
  createSectileCollectionAdapter('masonry', 'estimated'),
  createSectileCollectionAdapter('masonry', 'automatic'),
  createTanStackMasonryAdapter(),
  createSectileTrackGridAdapter('fixed'),
  createSectileTrackGridAdapter('estimated'),
  createReactWindowTrackGridAdapter(),
  createVirtuaTrackGridAdapter(),
  createSectileCollectionAdapter('spatial', 'positioned'),
]);

export const layoutCapabilities: readonly BenchmarkCapability[] = Object.freeze([
  capability('flow-grid', 'Sectile Virtual', true, ['fixed', 'estimated', 'automatic'], 'VirtualGrid supports exact, estimated, and DOM-discovered item heights.'),
  capability('flow-grid', 'React Virtuoso', true, ['automatic'], 'VirtuosoGrid derives responsive grid geometry from rendered items.'),
  capability('masonry', 'Sectile Virtual', true, ['fixed', 'estimated', 'automatic'], 'VirtualMasonry supports exact, estimated, and DOM-discovered item heights.'),
  capability('masonry', 'TanStack Virtual', true, ['estimated'], 'The public lanes API requires estimateSize.'),
  capability('track-grid', 'Sectile Virtual', true, ['fixed', 'estimated'], 'VirtualizerRoot uses trackGridLayoutStrategy with exact or estimated independent row tracks and exact column tracks.'),
  capability('track-grid', 'react-window', true, ['fixed'], 'Grid requires row and column sizes and lazily derives the aggregate extent for function sizes.'),
  capability('track-grid', 'Virtua', true, ['estimated'], 'experimental_VGrid receives row and column size hints.'),
  capability('spatial', 'Sectile Virtual', true, ['positioned'], 'VirtualSpatial consumes application-owned rectangles and z-order.'),
  capability('spatial', 'react-virtualized', false, ['positioned'], 'Collection is excluded until its application positioner can be isolated from timed library work.'),
]);

function capability(
  family: LayoutBenchmarkFamily,
  library: string,
  mutations: boolean,
  modes: BenchmarkCapability['modes'],
  note: string,
): BenchmarkCapability {
  return Object.freeze({ family, library, baseline: true, mutations, modes: Object.freeze(modes), note });
}

function createFixtureStore(initial: LayoutBenchmarkFixture): FixtureStore {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(fixture: LayoutBenchmarkFixture) {
      snapshot = fixture;
      for (const listener of listeners) listener();
    },
  });
}

function useFixture(store: FixtureStore): LayoutBenchmarkFixture {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

function createSectileCollectionAdapter(
  family: 'flow-grid' | 'masonry' | 'spatial',
  mode: LayoutSizeMode,
): LayoutBenchmarkAdapter {
  return Object.freeze({
    family,
    name: 'Sectile Virtual',
    version: sectileVirtualVersion,
    stack: 'Vue 3.5.22',
    mode,
    fixtureProfile: mode === 'fixed' ? 'uniform' : 'variable',
    validationMode: mode === 'fixed' || mode === 'positioned' ? 'exact' : 'estimated',
    mutationOperations: mode === 'fixed' ? structuralMutations : allMutations,
    mount(host: HTMLElement, initial: LayoutBenchmarkFixture) {
      const fixture = shallowRef(initial);
      const component = defineComponent({
        setup() {
          const componentType = family === 'flow-grid'
            ? SectileGrid
            : family === 'masonry'
              ? SectileMasonry
              : SectileSpatial;
          return () => h(componentType, {
            items: layoutAdapterItems(fixture.value),
            getID: layoutItemKey,
            ...(family === 'spatial'
              ? {
                  getRect: layoutItemRect,
                  getZIndex: layoutItemZIndex,
                  measureSize: false,
                }
              : family === 'flow-grid'
                ? {
                    sizePolicy: mode === 'fixed'
                      ? { kind: 'fixed' as const, extent: fixture.value.rowHeight }
                      : mode === 'estimated'
                        ? { kind: 'estimated' as const, estimate: fixture.value.rowHeight }
                        : { kind: 'measured' as const },
                    lanePolicy: {
                      kind: 'fixed' as const,
                      count: fixture.value.laneCount,
                      gap: fixture.value.gap,
                    },
                    rowGap: fixture.value.gap,
                  }
                : {
                    laneCount: fixture.value.laneCount,
                    laneGap: fixture.value.gap,
                    itemGap: fixture.value.gap,
                    ...(mode === 'fixed'
                      ? { itemSize: fixture.value.rowHeight }
                      : mode === 'estimated'
                        ? { estimateSize: fixture.value.rowHeight }
                        : {}),
                  }),
            overscan: 288,
            maxItems: 1_000_001,
            initialViewport: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
            class: 'bench-scroller',
            'data-revision': fixture.value.revision,
            style: viewportStyle(),
            itemAttributes: (_item: LayoutBenchmarkItem, index: number) => (
              layoutItemAttributes(fixture.value.items[index]!)
            ),
          }, {
            item: ({ index }: { index: number }) => layoutItemContent(fixture.value.items[index]!),
          });
        },
      });
      const app: App = createApp(component);
      app.mount(host);
      return Object.freeze({
        get scroller() { return requireScroller(host, 'Sectile layout adapter'); },
        update(next: LayoutBenchmarkFixture) { fixture.value = next; },
        unmount: () => app.unmount(),
      });
    },
  });
}

function createReactVirtuosoGridAdapter(): LayoutBenchmarkAdapter {
  const components: GridComponents = Object.freeze({
    List: forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function BenchmarkGridList(props, ref) {
      return createElement('div', { ...props, ref, className: `bench-flow-grid ${props.className ?? ''}` });
    }),
  });
  function App({ store }: { readonly store: FixtureStore }) {
    const fixture = useFixture(store);
    const items = layoutAdapterItems(fixture);
    return createElement(ReactVirtuosoGrid, {
      className: 'bench-scroller',
      'data-revision': fixture.revision,
      style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      data: items,
      components,
      computeItemKey: (_index: number, item: LayoutBenchmarkItem) => item.id,
      increaseViewportBy: 288,
      itemContent: (index: number) => createElement(
        'div',
        reactLayoutItemAttributes(fixture.items[index]!),
        layoutItemText(fixture.items[index]!),
      ),
    });
  }
  return reactAdapter('flow-grid', 'React Virtuoso', '4.18.12', 'automatic', 'estimated', App);
}

function createTanStackMasonryAdapter(): LayoutBenchmarkAdapter {
  function App({ store }: { readonly store: FixtureStore }) {
    const fixture = useFixture(store);
    const items = layoutAdapterItems(fixture);
    const parentRef = useRef<HTMLDivElement>(null);
    const virtualizer = useVirtualizer({
      count: items.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (index) => items[index]?.height ?? fixture.rowHeight,
      getItemKey: (index) => items[index]?.id ?? index,
      lanes: fixture.laneCount,
      gap: fixture.gap,
      overscan: 4,
    });
    const laneWidth = fixture.columnWidth;
    return createElement('div', {
      ref: parentRef,
      className: 'bench-scroller',
      'data-revision': fixture.revision,
      style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, overflow: 'auto' },
    }, createElement('div', {
      style: { position: 'relative', width: '100%', height: virtualizer.getTotalSize() },
    }, virtualizer.getVirtualItems().map((virtualItem) => {
      const item = fixture.items[virtualItem.index]!;
      return createElement('div', {
        ...reactLayoutItemAttributes(item),
        key: item.id,
        ref: virtualizer.measureElement,
        style: {
          position: 'absolute',
          width: laneWidth,
          height: item.height,
          transform: `translate3d(${virtualItem.lane * (laneWidth + fixture.gap)}px, ${virtualItem.start}px, 0)`,
        },
      }, layoutItemText(item));
    })));
  }
  return reactAdapter('masonry', 'TanStack Virtual', '3.14.10', 'estimated', 'estimated', App);
}

function createReactWindowTrackGridAdapter(): LayoutBenchmarkAdapter {
  interface CellData { readonly fixture: LayoutBenchmarkFixture }
  function Cell({ columnIndex, rowIndex, style, fixture }: CellComponentProps<CellData>) {
    const item = fixture.items[rowIndex * fixture.columnCount + columnIndex];
    if (item === undefined) return null;
    return createElement('div', { ...reactLayoutItemAttributes(item), style }, layoutItemText(item));
  }
  function App({ store }: { readonly store: FixtureStore }) {
    const fixture = useFixture(store);
    return createElement(ReactWindowGridComponent, {
      className: 'bench-scroller',
      'data-revision': fixture.revision,
      cellComponent: Cell,
      cellProps: { fixture },
      columnCount: fixture.columnCount,
      columnWidth: fixture.columnWidth,
      rowCount: fixture.rowCount,
      rowHeight: (index: number) => fixture.rowHeights[index] ?? fixture.rowHeight,
      overscanCount: 4,
      style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
    });
  }
  return reactAdapter('track-grid', 'react-window', '2.3.0', 'fixed', 'exact-geometry', App);
}

function createVirtuaTrackGridAdapter(): LayoutBenchmarkAdapter {
  function App({ store }: { readonly store: FixtureStore }) {
    const fixture = useFixture(store);
    return createElement(VirtuaGridComponent, {
      className: 'bench-scroller',
      'data-revision': fixture.revision,
      style: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      row: fixture.rowCount,
      col: fixture.columnCount,
      cellHeight: fixture.rowHeight,
      cellWidth: fixture.columnWidth,
      bufferSize: 288,
      children: ({ rowIndex, colIndex }: { readonly rowIndex: number; readonly colIndex: number }) => {
        const item = fixture.items[rowIndex * fixture.columnCount + colIndex];
        return item === undefined
          ? null
          : createElement('div', reactLayoutItemAttributes(item), layoutItemText(item));
      },
    });
  }
  return reactAdapter('track-grid', 'Virtua', '0.50.5', 'estimated', 'estimated', App, structuralMutations);
}

function createSectileTrackGridAdapter(mode: Extract<LayoutSizeMode, 'fixed' | 'estimated'>): LayoutBenchmarkAdapter {
  return Object.freeze({
    family: 'track-grid',
    name: 'Sectile Virtual',
    version: sectileVirtualVersion,
    stack: 'Vue 3.5.22',
    mode,
    fixtureProfile: 'variable',
    validationMode: mode === 'fixed' ? 'exact' : 'estimated',
    mutationOperations: allMutations,
    mount(host: HTMLElement, initial: LayoutBenchmarkFixture) {
      const fixture = shallowRef(initial);
      const component = defineComponent({
        setup() {
          const state = shallowRef(createTrackState(fixture.value, mode));
          const root = shallowRef<HTMLElement | null>(null);
          const virtualizer = useVueVirtualizer({
            // The harness pins Vue 3.5.22 while the workspace package builds against its current Vue peer.
            // Runtime refs are compatible; the nominal RefSymbol types are intentionally bridged at this adapter boundary.
            state: state as never,
            strategy: trackGridLayoutStrategy,
            root: root as never,
            overscan: 288,
            initialViewport: { x: 0, y: 0, width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
          });
          const update = (next: LayoutBenchmarkFixture): void => {
            fixture.value = next;
            state.value = createTrackState(next, mode);
          };
          (component as unknown as { update?: (next: LayoutBenchmarkFixture) => void }).update = update;
          onBeforeUnmount(() => { root.value = null; });
          return () => h('div', {
            ref: root,
            class: 'bench-scroller',
            'data-revision': fixture.value.revision,
            style: viewportStyle(),
          }, [h('div', {
            class: 'bench-content',
            style: {
              position: 'relative',
              width: `${virtualizer.plan.value?.contentSize.width ?? fixture.value.contentWidth}px`,
              height: `${virtualizer.plan.value?.contentSize.height ?? fixture.value.contentHeight}px`,
            },
          }, (virtualizer.plan.value?.placements ?? []).map((placement) => {
            const item = fixture.value.items[placement.index];
            if (item === undefined) return null;
            return h('div', {
              key: placement.id,
              ...layoutItemAttributes(item),
              style: {
                position: 'absolute',
                transform: `translate3d(${placement.rect.x}px, ${placement.rect.y}px, 0)`,
                width: `${placement.rect.width}px`,
                height: `${placement.rect.height}px`,
              },
            }, layoutItemContent(item));
          }))]);
        },
      });
      const app = createApp(component);
      app.mount(host);
      return Object.freeze({
        get scroller() { return requireScroller(host, 'Sectile track-grid adapter'); },
        update(next: LayoutBenchmarkFixture) {
          const update = (component as unknown as { update?: (value: LayoutBenchmarkFixture) => void }).update;
          if (update === undefined) throw new Error('Sectile track-grid updater is unavailable.');
          update(next);
        },
        unmount: () => app.unmount(),
      });
    },
  });
}

function createTrackState(
  fixture: LayoutBenchmarkFixture,
  mode: Extract<LayoutSizeMode, 'fixed' | 'estimated'>,
) {
  const rowKind = mode === 'fixed' ? 'exact' as const : 'estimated' as const;
  return createDenseTrackGridLayout(
    createExtentIndex(fixture.rowHeights.map((value) => ({ kind: rowKind, value }))),
    createExtentIndex(fixture.columnWidths.map((value) => ({ kind: 'exact' as const, value }))),
    layoutAdapterItems(fixture).map((item) => item.id),
    { maxRegions: 1_000_001 },
  );
}

function reactAdapter(
  family: LayoutBenchmarkFamily,
  name: string,
  version: string,
  mode: LayoutSizeMode,
  validationMode: LayoutValidationMode,
  component: (props: { readonly store: FixtureStore }) => ReactElement,
  mutationOperations: readonly LayoutMutationScenario['operation'][] = allMutations,
): LayoutBenchmarkAdapter {
  return Object.freeze({
    family, name, version, stack: 'React 19.2.8', mode,
    fixtureProfile: 'variable', validationMode,
    mutationOperations,
    mount(host: HTMLElement, initial: LayoutBenchmarkFixture) {
      const store = createFixtureStore(initial);
      const root: Root = createRoot(host);
      root.render(createElement(component, { store }));
      return Object.freeze({
        get scroller() { return requireScroller(host, `${name} ${family} adapter`); },
        update(next: LayoutBenchmarkFixture) { store.update(next); },
        unmount: () => root.unmount(),
      });
    },
  });
}

function layoutItemKey(item: LayoutBenchmarkItem): string { return item.id; }
function layoutItemRect(item: LayoutBenchmarkItem) { return Object.freeze({ x: item.x, y: item.y, width: item.width, height: item.height }); }
function layoutItemZIndex(item: LayoutBenchmarkItem): number { return item.zIndex; }
function layoutItemText(item: LayoutBenchmarkItem): string { return `${item.row}:${item.column} · ${item.id}`; }
function layoutItemContent(item: LayoutBenchmarkItem) { return [h('span', layoutItemText(item))]; }

function layoutItemAttributes(item: LayoutBenchmarkItem): Record<string, unknown> {
  return {
    class: 'bench-item',
    'data-id': item.id,
    'data-index': item.index,
    style: { height: `${item.height}px` },
  };
}

function reactLayoutItemAttributes(item: LayoutBenchmarkItem): Record<string, unknown> {
  return {
    className: 'bench-item',
    'data-id': item.id,
    'data-index': item.index,
    style: { width: item.width, height: item.height } satisfies CSSProperties,
  };
}

function viewportStyle(): Record<string, string> {
  return {
    width: `${VIEWPORT_WIDTH}px`,
    height: `${VIEWPORT_HEIGHT}px`,
    overflow: 'auto',
  };
}

function requireScroller(host: HTMLElement, owner: string): HTMLElement {
  const scroller = host.querySelector<HTMLElement>('.bench-scroller');
  if (scroller === null) throw new Error(`${owner} did not create .bench-scroller.`);
  return scroller;
}
