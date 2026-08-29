<script setup lang="ts">
import { useDataTable, createDataTableComponents, type DataTableSourceResolver } from '../../.verification-dist/data-table.js';
import { useDataGrid, createDataGridComponents, type DataGridSourceResolver } from '../../.verification-dist/data-grid.js';
import { useDataTreeGrid, createDataTreeGridComponents, type DataTreeGridSourceResolver } from '../../.verification-dist/data-tree-grid.js';

interface Cells {
  readonly name: string;
  readonly active: boolean;
}

const response = async (request: Parameters<DataTableSourceResolver<Cells>>[0]) => ({ ...request, viewRevision: 1, matchingLeafCount: { kind: 'known' as const, value: 0 }, visibleRowCount: { kind: 'known' as const, value: 0 }, rows: [], columnSchema: { revision: request.columnSchemaRevision, columns: [{ id: 'name' }, { id: 'active' }], headers: [] }, removedRowIDs: [] });
const table = useDataTable({ source: response as DataTableSourceResolver<Cells> });
const grid = useDataGrid({ source: response as DataGridSourceResolver<Cells> });
const treeGrid = useDataTreeGrid({ source: response as DataTreeGridSourceResolver<Cells> });
const DataTable = createDataTableComponents(table);
const DataGrid = createDataGridComponents(grid);
const DataTreeGrid = createDataTreeGridComponents(treeGrid);

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
