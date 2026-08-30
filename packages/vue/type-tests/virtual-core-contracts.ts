import type { StableID } from '@sectile/core';
import {
  trackGridLayoutStrategy,
  type GridTrackMeasurement,
  type TrackGridLayoutState,
  type TrackGridMutation,
} from '@sectile/virtual/track-grid-layout';
import type { Ref } from 'vue';
import {
  useVirtualizer,
  type UseVirtualizerOptions,
} from '../.verification-dist/virtual-core.js';

declare const state: Ref<TrackGridLayoutState>;

const options: UseVirtualizerOptions<
  TrackGridLayoutState,
  StableID,
  GridTrackMeasurement,
  TrackGridMutation
> = {
  state,
  strategy: trackGridLayoutStrategy,
};
const virtualizer = useVirtualizer(options);
virtualizer.scrollTo(1);
virtualizer.scrollTo('1');
