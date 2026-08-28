<script setup lang="ts">
import { DataTableBody, type DataTableViewRow } from '../../dist/data-table.js';
import { DataGridBody, type DataGridViewRow } from '../../dist/data-grid.js';
import { DataTreeGridBody, type DataTreeGridViewRow } from '../../dist/data-tree-grid.js';

const tableRowID = (row: DataTableViewRow): string => row.id;
const gridRowID = (row: DataGridViewRow): string => row.id;
const treeRowID = (row: DataTreeGridViewRow): string => row.id;
</script>

<template>
  <DataTableBody v-slot="{ row, rowIndex, isGroup }">
    {{ tableRowID(row) }} · {{ row.cells['name'] }} · {{ rowIndex.toFixed(0) }} · {{ isGroup.valueOf() }}
  </DataTableBody>
  <DataGridBody v-slot="{ row, rowIndex, isGroup }">
    {{ gridRowID(row) }} · {{ row.cells['name'] }} · {{ rowIndex.toFixed(0) }} · {{ isGroup.valueOf() }}
  </DataGridBody>
  <DataTreeGridBody v-slot="{ row, rowIndex, isGroup }">
    {{ treeRowID(row) }} · {{ row.cells['name'] }} · {{ rowIndex.toFixed(0) }} · {{ isGroup.valueOf() }}
  </DataTreeGridBody>
</template>
