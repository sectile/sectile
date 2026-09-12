import type { StableID } from '@sectile/core';
import type { ShallowRef } from 'vue';
import type { VirtualSizePolicy, VirtualLanePolicy } from '@sectile/virtual/collection';
import type { VirtualLayoutPlan, VirtualScrollport } from '@sectile/dom/virtual';
import type {
  VirtualCollectionExpose,
  VirtualCollectionItemSlotProps,
  VirtualCollectionLanePolicyProps,
  VirtualCollectionPhase,
  VirtualCollectionSizePolicyProps,
  VirtualListExpose,
  VirtualListPublicProps,
  VirtualListSlotProps,
} from '@sectile/vue/virtual/list';
import type {
  VirtualGridPublicProps,
  VirtualGridSlotProps,
} from '@sectile/vue/virtual/grid';
import type {
  VirtualMasonryPublicProps,
  VirtualMasonrySlotProps,
} from '@sectile/vue/virtual/masonry';
import type {
  VirtualSpatialPublicProps,
  VirtualSpatialSizeOwnership,
  VirtualSpatialSlotProps,
} from '@sectile/vue/virtual/spatial';

type NumberValue = Readonly<{ id: number; label: string }>;
type StringValue = Readonly<{ id: string; label: string }>;

declare const numberItems: readonly NumberValue[];
declare const stringItems: readonly StringValue[];
declare const elementScrollport: HTMLElement;
declare const documentScrollport: Document;
declare const browserWindow: Window;

const numberList: VirtualListPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
  scrollport: 'document',
};
numberList.getID(numberItems[0]!, 0) satisfies number;
numberList.sizePolicy satisfies VirtualSizePolicy<NumberValue>;

const stringList: VirtualListPublicProps<StringValue, string> = {
  items: stringItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'estimated', estimate: 24 },
};
stringList.getID(stringItems[0]!, 0) satisfies string;
stringList.sizePolicy satisfies VirtualSizePolicy<StringValue>;

const measuredList: VirtualListPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'measured' },
};
void measuredList;

const numberGrid: VirtualGridPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
  lanePolicy: { kind: 'fixed', count: 2 },
  scrollport: elementScrollport,
};
void numberGrid;

const numberMasonry: VirtualMasonryPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'estimated', estimate: 24 },
  lanePolicy: { kind: 'fixed', count: 2 },
  scrollport: documentScrollport,
};
numberMasonry.sizePolicy satisfies VirtualSizePolicy<NumberValue>;
numberMasonry.lanePolicy satisfies VirtualLanePolicy;

const numberSpatial: VirtualSpatialPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  getRect: (_value, index) => ({ x: 0, y: index * 20, width: 20, height: 20 }),
  sizeOwnership: 'declared',
  scrollport: null,
};
numberSpatial.sizeOwnership satisfies VirtualSpatialSizeOwnership;

'root' satisfies VirtualListPublicProps<NumberValue, number>['scrollport'];
'document' satisfies VirtualGridPublicProps<NumberValue, number>['scrollport'];
elementScrollport satisfies VirtualMasonryPublicProps<NumberValue, number>['scrollport'];
documentScrollport satisfies VirtualSpatialPublicProps<NumberValue, number>['scrollport'];
null satisfies VirtualListPublicProps<NumberValue, number>['scrollport'];
// @ts-expect-error Window is not a supported physical scrollport target.
browserWindow satisfies VirtualGridPublicProps<NumberValue, number>['scrollport'];

declare const commonSlot: VirtualCollectionItemSlotProps<NumberValue, number>;
commonSlot.id satisfies number;

declare const listSlot: VirtualListSlotProps<NumberValue, number>;
listSlot.id satisfies number;

declare const gridSlot: VirtualGridSlotProps<NumberValue, number>;
gridSlot.id satisfies number;

declare const masonrySlot: VirtualMasonrySlotProps<NumberValue, number>;
masonrySlot.id satisfies number;

declare const spatialSlot: VirtualSpatialSlotProps<NumberValue, number>;
spatialSlot.id satisfies number;

declare const commonExpose: VirtualCollectionExpose<object, StableID>;
commonExpose.scrollport satisfies ShallowRef<VirtualScrollport | null | undefined>;
commonExpose.surface satisfies ShallowRef<HTMLElement | null | undefined>;
commonExpose.plan satisfies VirtualLayoutPlan<StableID> | null;
commonExpose.phase satisfies VirtualCollectionPhase;
commonExpose.scrollToID(1);
commonExpose.scrollToID('one');

declare const listExpose: VirtualListExpose<number>;
listExpose.scrollToID(1);
listExpose.plan satisfies VirtualLayoutPlan<number> | null;

const fixedSize: VirtualSizePolicy<NumberValue> = { kind: 'fixed', extent: 24 };
const responsiveLanes: VirtualLanePolicy = {
  kind: 'responsive',
  minExtent: 160,
  maxCount: 6,
};
const sizePolicyProps: VirtualCollectionSizePolicyProps<NumberValue> = {
  sizePolicy: fixedSize,
};
const lanePolicyProps: VirtualCollectionLanePolicyProps = {
  lanePolicy: responsiveLanes,
};
void sizePolicyProps;
void lanePolicyProps;
