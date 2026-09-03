import type { StableID } from '@sectile/core';
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
} from '../.verification-dist/virtual-core.js';

declare const state: Ref<TrackGridLayoutState>;
declare const scrollport: ShallowRef<HTMLElement | null | undefined>;
declare const surface: ShallowRef<HTMLElement | null | undefined>;

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
virtualizer.scrollport satisfies ShallowRef<HTMLElement | null | undefined>;
virtualizer.surface satisfies ShallowRef<HTMLElement | null | undefined>;
virtualizer.scrollTo(1) satisfies VirtualizerOperationResult<unknown>;
virtualizer.scrollTo('1') satisfies VirtualizerOperationResult<unknown>;
virtualizer.flush() satisfies VirtualizerOperationResult<unknown>;

VirtualizerRoot satisfies object;
VirtualizerHeader satisfies object;
VirtualizerSurface satisfies object;
VirtualizerItem satisfies object;
VirtualizerFooter satisfies object;

declare const exposed: VirtualizerRootExpose;
exposed.scrollport satisfies ShallowRef<HTMLElement | null | undefined>;
exposed.surface satisfies ShallowRef<HTMLElement | null | undefined>;

// @ts-expect-error The removed content component has no compatibility export.
import { VirtualizerContent } from '../.verification-dist/virtual-core.js';
void VirtualizerContent;
