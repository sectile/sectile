<script setup lang="ts">
import { createTabularQuery } from '@sectile/tabular/query';
import { createDataTreeGridComponents, useDataTreeGrid } from '@sectile/vue/data-tree-grid';
import { createMemberInitialView, createMemberSource } from '../local-source/example.js';

const source = createMemberSource();
const query = createTabularQuery({
  groups: [{ id: 'member-role', columnID: 'role', policy: 'role' }],
});
const grid = useDataTreeGrid({
  source,
  defaultQuery: query,
  initialView: createMemberInitialView(source, query),
});
const Members = createDataTreeGridComponents(grid);
</script>

<template>
  <div data-example-tabular data-example-data-grid>
    <Members.Provider>
      <Members.Root aria-label="Project members grouped by role">
        <Members.Header>
          <Members.HeaderRow>
            <Members.ColumnHeader column="name">Name</Members.ColumnHeader>
            <Members.ColumnHeader column="role">Role</Members.ColumnHeader>
          </Members.HeaderRow>
        </Members.Header>
        <Members.Body v-slot="{ row, isGroup }">
          <Members.Cell column="name">
            <Members.RowDisclosure
              v-if="isGroup"
              :aria-label="`Expand or collapse ${row.cells.role}`"
            >
              <svg data-example-disclosure-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="m5 3 5 5-5 5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              {{ row.cells.role }}
            </Members.RowDisclosure>
            <span v-else>{{ row.cells.name }}</span>
          </Members.Cell>
          <Members.Cell column="role">{{ row.cells.role }}</Members.Cell>
        </Members.Body>
      </Members.Root>
    </Members.Provider>
    <output aria-live="polite">
      {{
        grid.status.value === 'loading' ? 'Updating groups…' : 'Expand a role to view its members.'
      }}
    </output>
    <p>
      Expand a role group to reveal its members. Expansion requests a new source view instead of
      merely unhiding stale DOM rows. The source owns grouping; the tree grid owns hierarchical cell
      navigation.
    </p>
  </div>
</template>
