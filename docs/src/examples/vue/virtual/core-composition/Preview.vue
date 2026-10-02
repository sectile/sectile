<script setup lang="ts">
import { createExactVirtualExtent, createVirtualCollection } from '@sectile/virtual/collection';
import { createUniformExtentIndex } from '@sectile/virtual/extent-index';
import { createLinearLayout, linearLayoutStrategy } from '@sectile/virtual/linear-layout';
import { VirtualizerHeader, VirtualizerItem, VirtualizerRoot, VirtualizerSurface, type VirtualizerRootProps } from '@sectile/vue/virtual/core';

const rows = Array.from({ length: 200 }, (_, id) => ({ id, label: `Delivery ${id + 1}` }));
const collection = createVirtualCollection(rows, row => row.id);
const state = createLinearLayout(collection.domain, createUniformExtentIndex(rows.length, createExactVirtualExtent(44)), { crossExtent: 256 });
// Root erases strategy generics; this strategy and defaultState are a matched linear pair.
const strategy = linearLayoutStrategy as VirtualizerRootProps['strategy'];
</script>

<template>
  <div data-example-virtual-core>
    <VirtualizerRoot v-slot="{ placements, scrollTo }" :default-state="state" :strategy="strategy" :initial-viewport="{ x: 0, y: 0, width: 256, height: 264 }" :overscan="88" aria-label="Composed delivery viewport">
      <VirtualizerHeader>
        <div data-example-control-row>
          <button type="button" @click="scrollTo(0, 'start')">First delivery</button>
          <button type="button" @click="scrollTo(149, 'start')">Delivery 150</button>
        </div>
      </VirtualizerHeader>
      <VirtualizerSurface>
        <VirtualizerItem v-for="placement in placements" :key="placement.id" :placement="placement" size="both">
          <div data-example-virtual-row>{{ rows[Number(placement.id)]?.label }}</div>
        </VirtualizerItem>
      </VirtualizerSurface>
    </VirtualizerRoot>
    <p>The application supplies the 256px-wide linear layout and scrollable root. Header, Surface and Item share one virtualizer; the header sits outside the item domain.</p>
  </div>
</template>
