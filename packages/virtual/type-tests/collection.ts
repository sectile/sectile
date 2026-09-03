import type { StableID } from '@sectile/core';
import type { Sequence } from '@sectile/core/sequence';
import {
  createVirtualCollection,
  createVirtualCollectionPatch,
  resolveVirtualLaneGeometry,
  updateVirtualCollection,
  type VirtualCollectionProjection,
  type VirtualCollectionTrustedUpdate,
  type VirtualLanePolicy,
  type VirtualSizePolicy,
} from '@sectile/virtual/collection';

type ID = 1 | 'two' | 'three';
interface Item {
  readonly id: ID;
  readonly size: number;
}

const items = [
  { id: 1, size: 10 },
  { id: 'two', size: 20 },
] as const satisfies readonly Item[];
const projection = createVirtualCollection<Item, ID>(items, (value) => value.id);
projection satisfies VirtualCollectionProjection<Item, ID>;
projection.domain satisfies Sequence<ID>;

const nextItems = [
  items[0],
  { id: 'three', size: 30 },
  items[1],
] as const satisfies readonly Item[];
const patch = createVirtualCollectionPatch(projection, {
  items: nextItems,
  index: 1,
  deleteCount: 0,
  inserted: ['three'],
});
patch satisfies VirtualCollectionTrustedUpdate<Item, ID>;
updateVirtualCollection(projection, patch) satisfies VirtualCollectionProjection<Item, ID>;
updateVirtualCollection(projection, {
  kind: 'raw',
  items: nextItems,
}) satisfies VirtualCollectionProjection<Item, ID>;

const measured = { kind: 'measured' } satisfies VirtualSizePolicy<Item>;
const estimated = {
  kind: 'estimated',
  estimate: (value: Item) => value.size,
} satisfies VirtualSizePolicy<Item>;
void measured;
void estimated;

const lanes = {
  kind: 'responsive',
  minExtent: 180,
  maxCount: 6,
  gap: 12,
} satisfies VirtualLanePolicy;
resolveVirtualLaneGeometry(640, lanes).count satisfies number;

const stable: StableID = projection.domain.at(0) ?? 'two';
void stable;

// @ts-expect-error Collection projections are opaque and must come from the owner.
const forgedProjection: VirtualCollectionProjection<Item, ID> = {
  items,
  domain: projection.domain,
  getID: (value) => value.id,
  change: null,
  valueChange: null,
};
void forgedProjection;

// @ts-expect-error Trusted patch updates are opaque and must come from the owner.
const forged: VirtualCollectionTrustedUpdate<Item, ID> = { kind: 'trusted-patch' };
void forged;

declare const stringPatch: VirtualCollectionTrustedUpdate<
  { readonly id: string },
  string
>;
// @ts-expect-error Trusted patches preserve their value and identity domains.
const mismatched: VirtualCollectionTrustedUpdate<Item, ID> = stringPatch;
void mismatched;
