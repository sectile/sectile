<script setup lang="ts">
import { VirtualList } from '@sectile/vue/virtual/list';
const rows = Array.from({ length: 200 }, (_, index) => ({
  id: index,
  label: `Delivery ${index + 1}`,
  notes:
    index % 3 === 0
      ? 'Leave the parcel at reception. Ask the receptionist to record the delivery and notify the recipient.'
      : 'Leave at reception.',
}));
const getID = (row: (typeof rows)[number]) => row.id;
</script>

<template>
  <div data-example-virtual-cards>
    <VirtualList
      :items="rows"
      :get-i-d="getID"
      :size-policy="{ kind: 'measured' }"
      :initial-viewport="{ x: 0, y: 0, width: 360, height: 264 }"
      :overscan="88"
      :gap="16"
      aria-label="Measured delivery notes"
    >
      <template #item="{ value: row }">
        <article data-example-virtual-card>
          <strong>{{ row.label }}</strong>
          <p>{{ row.notes }}</p>
        </article>
      </template>
    </VirtualList>
    <p>
      Mounted content establishes the initial size estimate. Different note lengths are measured
      rather than assigned a fixed row height.
    </p>
  </div>
</template>
