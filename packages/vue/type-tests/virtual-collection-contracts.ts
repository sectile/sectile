import type { StableID } from '@sectile/core';
import type { ShallowRef } from 'vue';
import type { VirtualSizePolicy, VirtualLanePolicy } from '@sectile/virtual/collection';
import type { VirtualLayoutPlan } from '@sectile/dom/virtual';
import type {
  VirtualCollectionExpose,
  VirtualCollectionItemSlotProps,
  VirtualCollectionLanePolicyProps,
  VirtualCollectionPhase,
  VirtualCollectionSizePolicyProps,
  VirtualListExpose,
  VirtualListPublicProps,
  VirtualListSlotProps,
} from '../.verification-dist/virtual-list.js';
import type {
  VirtualGridPublicProps,
  VirtualGridSlotProps,
} from '../.verification-dist/virtual-grid.js';
import type {
  VirtualMasonryPublicProps,
  VirtualMasonrySlotProps,
} from '../.verification-dist/virtual-masonry.js';
import type {
  VirtualSpatialPublicProps,
  VirtualSpatialSlotProps,
} from '../.verification-dist/virtual-spatial.js';

type NumberValue = Readonly<{ id: number; label: string }>;
type StringValue = Readonly<{ id: string; label: string }>;

declare const numberItems: readonly NumberValue[];
declare const stringItems: readonly StringValue[];

const numberList: VirtualListPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
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
};
void numberGrid;

const numberMasonry: VirtualMasonryPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  sizePolicy: { kind: 'estimated', estimate: 24 },
  lanePolicy: { kind: 'fixed', count: 2 },
};
numberMasonry.sizePolicy satisfies VirtualSizePolicy<NumberValue>;
numberMasonry.lanePolicy satisfies VirtualLanePolicy;

const numberSpatial: VirtualSpatialPublicProps<NumberValue, number> = {
  items: numberItems,
  getID: (value) => value.id,
  getRect: (_value, index) => ({ x: 0, y: index * 20, width: 20, height: 20 }),
};
void numberSpatial;

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
commonExpose.scrollport satisfies ShallowRef<HTMLElement | null | undefined>;
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
