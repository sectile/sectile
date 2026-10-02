<script setup lang="ts">
import { createTabularQuery } from '@sectile/tabular/query';
import { createDataTreeGridComponents, useDataTreeGrid } from '@sectile/vue/data-tree-grid';
import { createMemberInitialView, createMemberSource } from '../local-source/example.js';

const source = createMemberSource();
const query = createTabularQuery({ groups: [{ id: 'member-role', columnID: 'role', policy: 'role' }] });
const grid = useDataTreeGrid({
  source, defaultQuery: query, initialView: createMemberInitialView(source, query),
});
const Members = createDataTreeGridComponents(grid);
</script>

<template>
  <div data-example-tabular data-example-data-grid>
    <Members.Provider>
      <Members.Root aria-label="Project members grouped by role">
        <Members.Header><Members.HeaderRow><Members.ColumnHeader column="name">Name</Members.ColumnHeader><Members.ColumnHeader column="role">Role</Members.ColumnHeader></Members.HeaderRow></Members.Header>
        <Members.Body v-slot="{ row, isGroup }">
          <Members.Cell column="name"><Members.RowDisclosure v-if="isGroup" :aria-label="`Expand or collapse ${row.cells.role}`">Toggle group</Members.RowDisclosure><span v-else>{{ row.cells.name }}</span></Members.Cell>
          <Members.Cell column="role">{{ row.cells.role }}</Members.Cell>
        </Members.Body>
      </Members.Root>
    </Members.Provider>
    <output aria-live="polite">Status: {{ grid.status.value }}</output>
    <p>Expand a role group to reveal its members. Expansion requests a new source view instead of merely unhiding stale DOM rows. The source owns grouping; the tree grid owns hierarchical cell navigation.</p>
  </div>
</template>
