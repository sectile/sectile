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
        <label for="member-search">Search members</label>
        <Members.FilterControl
          scope="global"
          id="member-search"
          predicate="contains"
          aria-label="Search members"
          placeholder="Search name or role"
        />
        <Members.Header>
          <Members.HeaderRow>
            <Members.ColumnHeader column="name">
              <Members.SortTrigger column="name" comparator="text">
                Name
                <svg data-example-sort-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="m5 6 3-3 3 3M8 3v10m-3-3 3 3 3-3"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Members.SortTrigger>
            </Members.ColumnHeader>
            <Members.ColumnHeader column="role">Role</Members.ColumnHeader>
          </Members.HeaderRow>
        </Members.Header>
        <Members.Body>
          <template #default="{ row }">
            <Members.Cell column="name">{{ row.cells.name }}</Members.Cell>
            <Members.Cell column="role">{{ row.cells.role }}</Members.Cell>
          </template>
          <template #empty><p>No matching members.</p></template>
        </Members.Body>
      </Members.Root>
    </Members.Provider>
    <output aria-live="polite">
      {{
        grid.status.value === 'loading'
          ? 'Updating members…'
          : grid.status.value === 'error'
            ? 'Members could not be loaded.'
            : 'Members ready. Sort by name or search above.'
      }}
    </output>
    <p>
      Activate Name to change sorting or enter a search. The client source evaluates the query; the
      grid handles cell navigation and accepts matching response revisions. A small local view is
      preloaded for SSR; automatic source execution starts after mounting.
    </p>
  </div>
</template>
