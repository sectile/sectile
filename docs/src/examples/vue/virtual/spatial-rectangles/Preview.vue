<script setup lang="ts">
import { VirtualSpatial } from '@sectile/vue/virtual/spatial';
const parcels = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  label: `Parcel ${index + 1}`,
  rect: { x: (index % 3) * 160, y: Math.floor(index / 3) * 80, width: 144, height: 64 },
}));
const getID = (parcel: (typeof parcels)[number]) => parcel.id;
const getRect = (parcel: (typeof parcels)[number]) => parcel.rect;
</script>

<template>
  <div data-example-virtual-cards>
    <VirtualSpatial
      :items="parcels"
      :get-i-d="getID"
      :get-rect="getRect"
      size-ownership="declared"
      :initial-viewport="{ x: 0, y: 0, width: 360, height: 264 }"
      :overscan="32"
      aria-label="Spatial parcel map"
    >
      <template #item="{ value: parcel }">
        <div data-example-virtual-fixed-card>{{ parcel.label }}</div>
      </template>
    </VirtualSpatial>
    <p>
      The application declares surface-local rectangles. Scroll in either direction to inspect
      nearby parcels; mounted content does not redefine their dimensions.
    </p>
  </div>
</template>
