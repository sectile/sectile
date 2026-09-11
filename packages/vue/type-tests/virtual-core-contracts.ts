import type { StableID } from '@sectile/core';
import type { VirtualScrollport } from '@sectile/dom/virtual';
import {
  trackGridLayoutStrategy,
  type GridTrackMeasurement,
  type TrackGridLayoutState,
  type TrackGridMutation,
} from '@sectile/virtual/track-grid-layout';
import type { Ref, ShallowRef } from 'vue';
import {
  VirtualizerFooter,
  VirtualizerHeader,
  VirtualizerItem,
  VirtualizerRoot,
  VirtualizerSurface,
  useVirtualizer,
  type UseVirtualizerOptions,
  type VirtualizerOperationResult,
  type VirtualizerRootExpose,
  type VirtualizerRootProps,
  type VirtualizerScrollportTarget,
} from '@sectile/vue/virtual/core';

declare const state: Ref<TrackGridLayoutState>;
declare const scrollport: ShallowRef<VirtualScrollport | null | undefined>;
declare const surface: ShallowRef<HTMLElement | null | undefined>;
declare const elementScrollport: HTMLElement;
declare const documentScrollport: Document;
declare const browserWindow: Window;

const options: UseVirtualizerOptions<
  TrackGridLayoutState,
  StableID,
  GridTrackMeasurement,
  TrackGridMutation
> = {
  state,
  strategy: trackGridLayoutStrategy,
  scrollport,
  surface,
  viewportInsets: { top: 12 },
};
const virtualizer = useVirtualizer(options);
virtualizer.scrollport satisfies ShallowRef<VirtualScrollport | null | undefined>;
virtualizer.surface satisfies ShallowRef<HTMLElement | null | undefined>;
virtualizer.scrollTo(1) satisfies VirtualizerOperationResult<unknown>;
virtualizer.scrollTo('1') satisfies VirtualizerOperationResult<unknown>;
virtualizer.flush() satisfies VirtualizerOperationResult<unknown>;

'root' satisfies VirtualizerScrollportTarget;
'document' satisfies VirtualizerScrollportTarget;
elementScrollport satisfies VirtualizerScrollportTarget;
documentScrollport satisfies VirtualizerScrollportTarget;
null satisfies VirtualizerRootProps['scrollport'];
// @ts-expect-error Window is not a supported physical scrollport target.
browserWindow satisfies VirtualizerScrollportTarget;
// @ts-expect-error Unsupported selector strings are rejected.
'window' satisfies VirtualizerScrollportTarget;

VirtualizerRoot satisfies object;
VirtualizerHeader satisfies object;
VirtualizerSurface satisfies object;
VirtualizerItem satisfies object;
VirtualizerFooter satisfies object;

declare const exposed: VirtualizerRootExpose;
exposed.scrollport satisfies ShallowRef<VirtualScrollport | null | undefined>;
exposed.surface satisfies ShallowRef<HTMLElement | null | undefined>;
