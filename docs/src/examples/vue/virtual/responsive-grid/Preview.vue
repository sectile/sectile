<script setup lang="ts">
import { VirtualGrid } from '@sectile/vue/virtual/grid';
const rows = Array.from({ length: 200 }, (_, index) => ({ id: index, label: `Parcel ${index + 1}` }));
const getID = (row: (typeof rows)[number]) => row.id;
</script>

<template>
  <div data-example-virtual-cards><VirtualGrid :items="rows" :get-i-d="getID" :size-policy="{ kind: 'fixed', extent: 64 }" :lane-policy="{ kind: 'responsive', minExtent: 140, maxCount: 3, gap: 16 }" :row-gap="16" :initial-viewport="{ x: 0, y: 0, width: 360, height: 264 }" :overscan="88" aria-label="Parcel grid"><template #item="{ value: row }"><div data-example-virtual-fixed-card>{{ row.label }}</div></template></VirtualGrid><p>Cards are exactly 64px tall. Available surface width determines one to three lanes, with 16px gaps.</p></div>
</template>
