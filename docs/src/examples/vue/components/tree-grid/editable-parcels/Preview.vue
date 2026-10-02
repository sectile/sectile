<script setup lang="ts">
import { ref } from 'vue';
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridRoot, TreeGridRow } from '@sectile/vue/tree-grid';

const rows = [
  { id: 'parcels', parentID: null, cells: ['group-name', 'group-status'] },
  { id: 'parcel-a', parentID: 'parcels', cells: ['a-name', 'a-status'] },
  { id: 'parcel-b', parentID: 'parcels', cells: ['b-name', 'b-status'] },
];
const values = ref<Record<string, string>>({
  'group-name': 'Parcels', 'group-status': '2 deliveries',
  'a-name': 'Parcel A', 'a-status': 'Ready',
  'b-name': 'Parcel B', 'b-status': 'Packed',
});
const expanded = ref<readonly string[]>(['parcels']);
const selected = ref<string | null>('a-name');
const getCellValue = (id: string) => values.value[id] ?? '';
const setCellValue = (id: string, value: string) => { values.value = { ...values.value, [id]: value }; };
</script>

<template>
  <div data-example-tree-grid>
    <TreeGridRoot v-model="selected" v-model:expanded-value="expanded" :rows="rows" :get-cell-value="getCellValue" :set-cell-value="setCellValue" aria-label="Editable parcel hierarchy">
      <TreeGridRow v-for="(row, rowIndex) in rows" v-show="row.parentID === null || expanded.includes(row.parentID)" :key="row.id" :value="row.id" :row-index="rowIndex" :level="row.parentID === null ? 1 : 2" :expandable="row.parentID === null">
        <TreeGridCell v-for="(cell, columnIndex) in row.cells" :key="cell" v-slot="state" :value="cell" :column-index="columnIndex">
          <TreeGridDisclosure v-if="row.parentID === null && columnIndex === 0" :for="row.id" as="button" aria-label="Expand or collapse parcels">{{ expanded.includes(row.id) ? '−' : '+' }}</TreeGridDisclosure>
          <span v-if="!state.editing">{{ getCellValue(cell) }}</span>
          <TreeGridEditor :for="cell" :label="`Edit ${getCellValue(cell)}`" />
        </TreeGridCell>
      </TreeGridRow>
    </TreeGridRoot>
    <output aria-live="polite">Selected cell: {{ selected ?? 'none' }}</output>
    <p>Navigate cells with arrow keys. Enter starts editing; Enter commits and Escape cancels. The application supplies cell values and stores committed changes.</p>
  </div>
</template>
