<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { VirtualList } from '@sectile/vue/virtual/list';
import { VirtualGrid } from '@sectile/vue/virtual/grid';
import { VirtualMasonry } from '@sectile/vue/virtual/masonry';
import { VirtualSpatial } from '@sectile/vue/virtual/spatial';
import type { VirtualLayoutPlan } from '@sectile/dom/virtual';

type Row = { readonly id: 1 | 2; readonly label: string };
const items: readonly Row[] = [{ id: 1, label: 'One' }, { id: 2, label: 'Two' }];
const getID = (row: Row): 1 | 2 => row.id;
const sizePolicy = { kind: 'fixed', extent: 24 } as const;
const lanePolicy = { kind: 'fixed', count: 2 } as const;
const getRect = () => ({ x: 0, y: 0, width: 24, height: 24 });

const list = useTemplateRef('list');
const grid = useTemplateRef('grid');
const masonry = useTemplateRef('masonry');
const spatial = useTemplateRef('spatial');
list.value?.scrollToID(1);
grid.value?.scrollToID(2);
masonry.value?.scrollToID(1);
spatial.value?.scrollToID(2);
list.value?.plan satisfies VirtualLayoutPlan<1 | 2> | null | undefined;
grid.value?.plan satisfies VirtualLayoutPlan<1 | 2> | null | undefined;
masonry.value?.flush();
spatial.value?.refresh();
list.value?.surface satisfies HTMLElement | null | undefined;
// @ts-expect-error Exposed commands retain the inferred numeric ID domain.
list.value?.scrollToID('one');
// @ts-expect-error Exposed commands retain the inferred numeric ID domain.
grid.value?.scrollToID('one');
// @ts-expect-error Exposed commands retain the inferred numeric ID domain.
masonry.value?.scrollToID('one');
// @ts-expect-error Exposed commands retain the inferred numeric ID domain.
spatial.value?.scrollToID('one');
</script>

<template>
  <VirtualList ref="list" :items="items" :get-i-d="getID" :size-policy="sizePolicy" />
  <VirtualGrid ref="grid" :items="items" :get-i-d="getID" :size-policy="sizePolicy" :lane-policy="lanePolicy" />
  <VirtualMasonry ref="masonry" :items="items" :get-i-d="getID" :size-policy="sizePolicy" :lane-policy="lanePolicy" />
  <VirtualSpatial ref="spatial" :items="items" :get-i-d="getID" :get-rect="getRect" size-ownership="declared" />
</template>
