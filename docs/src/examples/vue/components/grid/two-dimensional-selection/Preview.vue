<script setup lang="ts">
import { ref } from 'vue';
import { GridCell, GridRoot, GridRow } from '@sectile/vue/grid';
const rows = [
  ['A1', 'A2', 'A3'],
  ['B1', 'B2', 'B3'],
];
const selected = ref<string | null>('A1');
const labels: Record<string, string> = {
  A1: '09:00',
  A2: '10:00',
  A3: '11:00',
  B1: '13:00',
  B2: '14:00',
  B3: '15:00',
};
</script>

<template>
  <div data-example-grid>
    <div data-example-grid-headings aria-hidden="true">
      <span>Monday</span>
      <span>Tuesday</span>
      <span>Wednesday</span>
    </div>
    <GridRoot v-model="selected" :rows="rows" label="Delivery slots">
      <GridRow v-for="(row, index) in rows" :key="index">
        <GridCell
          v-for="(cell, column) in row"
          :key="cell"
          :value="cell"
          :aria-label="`${['Monday', 'Tuesday', 'Wednesday'][column]} ${labels[cell]}`"
        >
          {{ labels[cell] }}
        </GridCell>
      </GridRow>
    </GridRoot>
    <output aria-live="polite">
      Selected slot:
      {{
        selected
          ? `${['Monday', 'Tuesday', 'Wednesday'][Number(selected[1]) - 1]} ${labels[selected]}`
          : 'none'
      }}
    </output>
    <p>Arrow keys navigate in two dimensions. Activating a cell selects its stable value.</p>
  </div>
</template>
