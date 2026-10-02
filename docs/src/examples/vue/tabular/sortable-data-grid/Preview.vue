<script setup lang="ts">
import { createDataGridComponents, useDataGrid } from '@sectile/vue/data-grid';
import { createMemberInitialView, createMemberSource } from '../local-source/example.js';

const source = createMemberSource();
const grid = useDataGrid({ source, initialView: createMemberInitialView(source) });
const Members = createDataGridComponents(grid);
</script>

<template>
  <div data-example-tabular data-example-data-grid>
    <Members.Provider>
      <Members.Root aria-label="Sortable project members">
        <Members.FilterControl scope="global" id="member-search" predicate="contains" aria-label="Search members" placeholder="Search name or role" />
        <Members.Header><Members.HeaderRow><Members.ColumnHeader column="name"><Members.SortTrigger column="name" comparator="text">Name</Members.SortTrigger></Members.ColumnHeader><Members.ColumnHeader column="role">Role</Members.ColumnHeader></Members.HeaderRow></Members.Header>
        <Members.Body>
          <template #default="{ row }"><Members.Cell column="name">{{ row.cells.name }}</Members.Cell><Members.Cell column="role">{{ row.cells.role }}</Members.Cell></template>
          <template #empty><p>No matching members.</p></template>
        </Members.Body>
      </Members.Root>
    </Members.Provider>
    <output aria-live="polite">Status: {{ grid.status.value }}</output>
    <p>Activate Name to change sorting or enter a search. The client source evaluates the query; the grid handles cell navigation and accepts matching response revisions. A small local view is preloaded for SSR; automatic source execution starts after mounting.</p>
  </div>
</template>
