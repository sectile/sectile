<script setup lang="ts">
import { VirtualMasonry } from '@sectile/vue/virtual/masonry';
const rows = Array.from({ length: 120 }, (_, index) => ({ id: index, label: `Delivery ${index + 1}`, notes: index % 3 === 0 ? 'Leave at reception and record the recipient’s name. If reception is closed, use the collection point and notify the recipient.' : 'Leave at reception.' }));
const getID = (row: (typeof rows)[number]) => row.id;
</script>

<template>
  <div data-example-virtual-cards><VirtualMasonry :items="rows" :get-i-d="getID" :size-policy="{ kind: 'estimated', estimate: 120 }" :lane-policy="{ kind: 'responsive', minExtent: 140, maxCount: 3, gap: 16 }" :item-gap="16" :initial-viewport="{ x: 0, y: 0, width: 360, height: 264 }" :overscan="88" aria-label="Delivery note masonry"><template #item="{ value: row }"><article data-example-virtual-card><strong>{{ row.label }}</strong><p>{{ row.notes }}</p></article></template></VirtualMasonry><p>The initial 120px estimate is refined by mounted card measurements. Card heights can differ; lane and item gaps stay at 16px.</p></div>
</template>
