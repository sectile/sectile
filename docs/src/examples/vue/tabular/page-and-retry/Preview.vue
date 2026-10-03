<script setup lang="ts">
import { computed } from 'vue';
import {
  createDataGridComponents,
  useDataGrid,
  type DataGridAccessState,
} from '@sectile/vue/data-grid';
import { createMemberInitialView } from '../local-source/example.js';
import { createRecoverableMemberSource } from './example.js';

const local = createRecoverableMemberSource();
const access: DataGridAccessState = {
  kind: 'page',
  page: 1,
  itemsPerPage: 2,
  visibleRowCount: null,
  pagination: null,
};
const grid = useDataGrid({
  source: local.source,
  defaultAccessState: access,
  initialView: createMemberInitialView(local.source, undefined, access),
});
const Members = createDataGridComponents(grid);
const currentAccess = computed(() => grid.snapshot.value.tabular.state.accessState);
const page = computed(() => (currentAccess.value.kind === 'page' ? currentAccess.value.page : 1));
const pageCount = computed(() => {
  const current = currentAccess.value;
  return current.kind === 'page'
    ? Math.max(1, Math.ceil((current.visibleRowCount ?? 0) / current.itemsPerPage))
    : 1;
});
const errorMessage = computed(() =>
  grid.error.value instanceof Error
    ? grid.error.value.message
    : 'The request failed. Retry to load this page.',
);
function move(step: number) {
  const current = currentAccess.value;
  if (current.kind !== 'page') return;
  const target = current.page + step;
  const result = grid.dispatch({
    type: 'set-access',
    accessState: {
      ...current,
      page: target,
      pagination:
        current.visibleRowCount === null
          ? null
          : { page: target, itemsPerPage: current.itemsPerPage },
    },
  });
  if (!result.ok) throw new Error(result.error.message);
}
function failReload() {
  local.failNextRequest();
  grid.reload();
}
</script>

<template>
  <div data-example-tabular data-example-data-grid>
    <div data-example-control-row>
      <button
        type="button"
        :disabled="page === 1 || grid.status.value === 'loading'"
        @click="move(-1)"
      >
        Previous page
      </button>
      <output aria-live="polite">Page {{ page }} of {{ pageCount }}</output>
      <button
        type="button"
        :disabled="page >= pageCount || grid.status.value === 'loading'"
        @click="move(1)"
      >
        Next page
      </button>
    </div>
    <Members.Provider>
      <Members.Root aria-label="Paged project members">
        <Members.Header>
          <Members.HeaderRow>
            <Members.ColumnHeader column="name">Name</Members.ColumnHeader>
            <Members.ColumnHeader column="role">Role</Members.ColumnHeader>
          </Members.HeaderRow>
        </Members.Header>
        <Members.Body>
          <template #default="{ row }">
            <Members.Cell column="name">{{ row.cells.name }}</Members.Cell>
            <Members.Cell column="role">{{ row.cells.role }}</Members.Cell>
          </template>
          <template #empty><p>No members on this page.</p></template>
        </Members.Body>
      </Members.Root>
    </Members.Provider>
    <p v-if="grid.status.value === 'error'" class="docs-example-source-error" role="alert">
      {{ errorMessage }}
    </p>
    <div data-example-control-row>
      <button type="button" :disabled="grid.status.value === 'loading'" @click="failReload">
        Simulate failed reload
      </button>
      <button v-if="grid.status.value === 'error'" type="button" @click="grid.reload()">
        Retry this page
      </button>
    </div>
    <output aria-live="polite">Request: {{ grid.status.value }}</output>
    <p>
      The source returns two members per page and the total visible count. A failed reload keeps the
      last accepted rows visible; Retry requests the current page again. The local failure affects
      one request only. This example does not contact a server.
    </p>
  </div>
</template>
