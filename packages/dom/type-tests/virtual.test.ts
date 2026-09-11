import type { StableID } from '@sectile/core';
import {
  createVirtualizer,
  virtualSurfaceStyle,
  type VirtualScrollport,
  type VirtualScrollWriter,
  type VirtualViewportReader,
  type VirtualizerConnection,
  type VirtualizerOptions,
} from '@sectile/dom/virtual';
import type {
  VirtualLayoutStrategy,
  VirtualPoint,
} from '@sectile/virtual/layout';

interface State {
  readonly generation: number;
}
type ID = 'first' | 2;
type Measurement = number;
type Mutation = { readonly type: 'replace' };

declare const scrollport: HTMLElement;
declare const documentScrollport: Document;
declare const browserWindow: Window;
declare const surface: HTMLElement;
declare const frameRegion: HTMLElement;
declare const strategy: VirtualLayoutStrategy<
  State,
  ID,
  Measurement,
  Mutation
>;

const options = {
  scrollport,
  surface,
  state: { generation: 0 },
  strategy,
  viewportInsets: { top: 12, left: 4 },
} satisfies VirtualizerOptions<State, ID, Measurement, Mutation>;

const connection = createVirtualizer(options);
connection satisfies VirtualizerConnection<State, ID, Measurement, Mutation>;

const documentOptions = {
  scrollport: documentScrollport,
  surface,
  state: { generation: 0 },
  strategy,
  readViewport: ((target) => ({ x: 0, y: 0, width: 100, height: 80 })) satisfies VirtualViewportReader,
  writeScroll: ((target, targetPoint) => { void target; void targetPoint; }) satisfies VirtualScrollWriter,
} satisfies VirtualizerOptions<State, ID, Measurement, Mutation>;
createVirtualizer(documentOptions) satisfies VirtualizerConnection<State, ID, Measurement, Mutation>;
const validElementScrollport: VirtualScrollport = scrollport;
const validDocumentScrollport: VirtualScrollport = documentScrollport;
void validElementScrollport;
void validDocumentScrollport;
// @ts-expect-error Window is not a parallel page-scroll target; use its Document.
const invalidWindowScrollport: VirtualScrollport = browserWindow;
void invalidWindowScrollport;
connection.setViewportInsets({ top: 20 });
connection.registerFrame(frameRegion)();
connection.scrollTo(2, 'center') satisfies ReturnType<
  VirtualizerConnection<State, ID, Measurement, Mutation>['scrollTo']
>;
virtualSurfaceStyle(connection.getPlan()) satisfies Readonly<Record<string, string>>;

const point: VirtualPoint = { x: 0, y: 0 };
const stable: StableID = 2;
void point;
void stable;

// @ts-expect-error A virtualizer requires an explicit surface coordinate owner.
createVirtualizer<State, ID, Measurement, Mutation>({
  scrollport,
  state: { generation: 0 },
  strategy,
});
