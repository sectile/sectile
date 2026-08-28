<script setup lang="ts">
import { defineDataTableColumns, useDataTable, useDataTableComponents } from '../../dist/data-table.js';
import { defineDataGridColumns, useDataGrid, useDataGridComponents } from '../../dist/data-grid.js';
import { defineDataTreeGridColumns, useDataTreeGrid, useDataTreeGridComponents } from '../../dist/data-tree-grid.js';

interface Cells {
  readonly name: string;
  readonly active: boolean;
}

const table = useDataTable<Cells>({ columns: defineDataTableColumns([{ id: 'name' }, { id: 'active' }]) });
const grid = useDataGrid<Cells>({ columns: defineDataGridColumns([{ id: 'name' }, { id: 'active' }]) });
const treeGrid = useDataTreeGrid<Cells>({ columns: defineDataTreeGridColumns([{ id: 'name' }, { id: 'active' }]) });
const DataTable = useDataTableComponents(table);
const DataGrid = useDataGridComponents(grid);
const DataTreeGrid = useDataTreeGridComponents(treeGrid);

const stringValue = (value: string): string => value;
const booleanValue = (value: boolean): boolean => value;
</script>

<template>
  <DataTable.Provider>
    <DataTable.Root>
      <DataTable.Body v-slot="{ row, rowIndex, isGroup }">
        <DataTable.Cell column="name">{{ stringValue(row.cells.name) }}</DataTable.Cell>
        <DataTable.Cell column="active">{{ booleanValue(row.cells.active) }}</DataTable.Cell>
        {{ rowIndex.toFixed(0) }} · {{ isGroup.valueOf() }}
      </DataTable.Body>
    </DataTable.Root>
  </DataTable.Provider>

  <DataGrid.Provider>
    <DataGrid.Root>
      <DataGrid.Body v-slot="{ row }">
        <DataGrid.Cell column="name">{{ stringValue(row.cells.name) }}</DataGrid.Cell>
        <DataGrid.Cell column="active">{{ booleanValue(row.cells.active) }}</DataGrid.Cell>
      </DataGrid.Body>
    </DataGrid.Root>
  </DataGrid.Provider>

  <DataTreeGrid.Provider>
    <DataTreeGrid.Root>
      <DataTreeGrid.Body v-slot="{ row }">
        <DataTreeGrid.Cell column="name">{{ stringValue(row.cells.name) }}</DataTreeGrid.Cell>
        <DataTreeGrid.Cell column="active">{{ booleanValue(row.cells.active) }}</DataTreeGrid.Cell>
      </DataTreeGrid.Body>
    </DataTreeGrid.Root>
  </DataTreeGrid.Provider>
</template>
