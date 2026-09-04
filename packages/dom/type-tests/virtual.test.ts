import type { StableID } from '@sectile/core';
import {
  createVirtualizer,
  virtualSurfaceStyle,
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
