<script setup lang="ts">
import { createDataTableComponents, useDataTable } from '@sectile/vue/data-table';
import { resolveMembers } from './example.js';

const table = useDataTable({ source: resolveMembers });
const Members = createDataTableComponents(table);
</script>

<template>
  <div data-example-tabular>
    <Members.Provider>
      <Members.Root>
        <Members.Caption>Project members</Members.Caption>
        <Members.Header><Members.HeaderRow><Members.ColumnHeader column="name">Name</Members.ColumnHeader><Members.ColumnHeader column="role">Role</Members.ColumnHeader></Members.HeaderRow></Members.Header>
        <Members.Body v-slot="{ row }"><Members.Cell column="name">{{ row.cells.name }}</Members.Cell><Members.Cell column="role">{{ row.cells.role }}</Members.Cell></Members.Body>
      </Members.Root>
    </Members.Provider>
    <output aria-live="polite">Status: {{ table.status.value }}</output>
    <p v-if="table.status.value === 'loading'">Loading members.</p>
    <div v-if="table.status.value === 'error'"><p>Members could not be loaded.</p><button type="button" @click="table.reload">Retry</button></div>
  </div>
</template>
