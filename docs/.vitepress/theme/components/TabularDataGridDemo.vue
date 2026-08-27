<script setup lang="ts">
import { computed, reactive } from 'vue';
import { ArrowDownUp, CheckCircle2, MousePointer2, PencilLine } from '@lucide/vue';
import {
  DataGridBody,
  DataGridCell,
  DataGridColumnHeader,
  DataGridEditor,
  DataGridHeader,
  DataGridHeaderRow,
  DataGridProvider,
  DataGridRoot,
  DataGridRow,
  DataGridRowSelectionControl,
  DataGridSortTrigger,
  defineDataGridColumns,
  useDataGrid,
  useDataGridSource,
  type DataGridCommand,
  type DataGridEditState,
  type DataGridViewResponse,
} from '@sectile/vue/data-grid';
import { useDocsLocale } from '../locale.js';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '출시 준비 보드', subtitle: '키보드로 셀을 이동하고 바로 편집', columns: ['작업', '담당자', '상태'],
  hint: '셀 선택 · 방향키 이동 · Enter 편집 · Escape 취소', edit: '첫 셀 편집', selected: '개 행 선택',
  status: { Ready: '준비', Review: '검토', Blocked: '차단' },
} : {
  title: 'Release readiness', subtitle: 'Move by keyboard and edit in place', columns: ['Task', 'Owner', 'Status'],
  hint: 'Select a cell · Arrow keys move · Enter edits · Escape cancels', edit: 'Edit first cell', selected: 'rows selected',
  status: { Ready: 'Ready', Review: 'Review', Blocked: 'Blocked' },
});

const records = reactive([
  { id: 'tokens', task: 'Design tokens', owner: 'Mina', status: 'Ready' },
  { id: 'keyboard', task: 'Keyboard QA', owner: 'Alex', status: 'Review' },
  { id: 'docs', task: 'Migration guide', owner: 'Jules', status: 'Blocked' },
  { id: 'release', task: 'Release notes', owner: 'Sam', status: 'Ready' },
]);
const columns = defineDataGridColumns([
  { id: 'task', label: 'Task', capabilities: ['sort', 'edit'] },
  { id: 'owner', label: 'Owner', capabilities: ['sort', 'edit'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'edit'] },
]);
let viewRevision = 0;
const grid = useDataGrid({ columns });
useDataGridSource(grid, (request): DataGridViewResponse => {
  let result = [...records];
  const sort = request.query.sort[0];
  if (sort !== undefined) result.sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { task: record.task, owner: record.owner, status: record.status } }));
  return {
    protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision, expansionRevision: request.expansionRevision,
    viewRevision: ++viewRevision, access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length },
    rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [],
  };
});

const rows = computed(() => {
  const accepted = grid.acceptedViewState.value;
  return accepted.kind === 'none' ? [] : accepted.view.rows.filter((row) => row.kind === 'leaf');
});
const selectedCount = computed(() => {
  void grid.snapshot.value;
  const selection = grid.getProjection().rowSelection;
  return selection.kind === 'explicit-rows' ? selection.rowIDs.length : Math.max(0, rows.value.length - selection.excludedRowIDs.length);
});
const isEditing = (state: DataGridEditState, rowID: string, columnID: string) => state.kind === 'editing' && state.cell.rowID === rowID && state.cell.columnID === columnID;
const beginFirstEdit = () => {
  const first = rows.value[0];
  if (first === undefined) return;
  grid.dispatch({ type: 'focus-cell', cell: { rowID: first.id, columnID: 'task' } });
  grid.dispatch({ type: 'begin-edit', cell: { rowID: first.id, columnID: 'task' } });
};
const handleCommand = (command: DataGridCommand) => {
  if (command.type !== 'commit-edit') return;
  const record = records.find((item) => item.id === command.cell.rowID);
  if (record === undefined || typeof command.value !== 'string') return;
  if (command.cell.columnID === 'task') record.task = command.value;
  if (command.cell.columnID === 'owner') record.owner = command.value;
  if (command.cell.columnID === 'status') record.status = command.value;
  grid.requestView();
};
</script>

<template>
  <section class="tabular-demo tabular-demo--grid" :aria-label="copy.title">
    <header class="tabular-demo__toolbar">
      <div class="tabular-demo__title"><span><MousePointer2 :size="18" aria-hidden="true" /></span><div><strong>{{ copy.title }}</strong><small>{{ copy.subtitle }}</small></div></div>
      <button class="tabular-demo__action" type="button" @click="beginFirstEdit"><PencilLine :size="15" aria-hidden="true" />{{ copy.edit }}</button>
    </header>
    <DataGridProvider :controller="grid">
      <DataGridRoot class="tabular-grid" aria-label="Release readiness" @command="handleCommand">
        <DataGridHeader>
          <DataGridHeaderRow :depth="0">
            <DataGridColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">
              <DataGridSortTrigger :columnID="column.id">{{ copy.columns[index] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGridSortTrigger>
            </DataGridColumnHeader>
          </DataGridHeaderRow>
        </DataGridHeader>
        <DataGridBody>
          <DataGridRow v-for="row in rows" :key="row.id" :rowID="row.id">
            <DataGridCell v-for="column in columns" :key="`${row.id}:${column.id}`" :rowID="row.id" :columnID="column.id" v-slot="{ editState }">
              <DataGridRowSelectionControl v-if="column.id === 'task'" :rowID="row.id" name="release-items" :value="row.id" :aria-label="`Select ${row.cells['task']}`" />
              <span v-if="!isEditing(editState, row.id, column.id)" :class="{ 'tabular-demo__status': column.id === 'status' }" :data-tone="column.id === 'status' ? row.cells['status'] : undefined">{{ column.id === 'status' ? copy.status[row.cells['status'] as keyof typeof copy.status] : row.cells[column.id] }}</span>
              <DataGridEditor :rowID="row.id" :columnID="column.id" :value="row.cells[column.id]" :aria-label="`Edit ${column.id} for ${row.id}`" />
            </DataGridCell>
          </DataGridRow>
        </DataGridBody>
      </DataGridRoot>
    </DataGridProvider>
    <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong><CheckCircle2 :size="15" aria-hidden="true" />{{ selectedCount }} {{ copy.selected }}</strong></footer>
  </section>
</template>
