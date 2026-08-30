import { createSequence, type Sequence } from '@sectile/core/sequence';
import {
  createSpatialLayout,
  type SpatialItem,
  type SpatialLayoutInput,
} from '../dist/spatial-layout.js';

const items = [
  { id: 'alpha', rect: { x: 0, y: 0, width: 10, height: 10 } },
  { id: 'beta', rect: { x: 20, y: 0, width: 10, height: 10 } },
] as const satisfies readonly SpatialItem<'alpha' | 'beta'>[];
const domain = createSequence(items.map(({ id }) => id));
const input = {
  maxItems: 2,
  domain,
} satisfies SpatialLayoutInput<'alpha' | 'beta'>;
const state = createSpatialLayout(items, input);

state.domain satisfies Sequence<'alpha' | 'beta'>;

const unrelatedDomain = createSequence<'gamma'>(['gamma'] as const);
// @ts-expect-error A prepared domain must use the same identity type as the spatial items.
createSpatialLayout<'alpha' | 'beta'>(items, { domain: unrelatedDomain });
