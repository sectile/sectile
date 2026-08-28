<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ArrowDownUp, CheckCircle2, PencilLine, TableCellsSplit } from '@lucide/vue';
import {
  createDataGridComponents,
  defineDataGridColumns,
  useDataGrid,
  useDataGridSource,
  type DataGridCommand,
  type DataGridEditState,
  type DataGridRootExpose,
  type DataGridViewResponse,
} from '@sectile/vue/data-grid';
import { useDocsLocale } from '../locale.js';
import { rowSelectionValue } from '../tabular-selection.js';
import DocsCheckbox from './DocsCheckbox.vue';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '출시 준비 보드', subtitle: '셀을 이동하며 릴리스 항목을 바로 편집', columns: ['작업', '담당자', '영역', '목표일', '위험도', '상태'],
  hint: '셀 선택 · 방향키 이동 · Enter 편집 · Escape 취소', edit: '첫 셀 편집',
  status: { Ready: '준비', Review: '검토', Blocked: '차단', Progress: '진행 중' },
} : {
  title: 'Release readiness', subtitle: 'Move through cells and edit release work in place', columns: ['Work item', 'Owner', 'Area', 'Target', 'Risk', 'Status'],
  hint: 'Select a cell · Arrow keys move · Enter edits · Escape cancels', edit: 'Edit first cell',
  status: { Ready: 'Ready', Review: 'Review', Blocked: 'Blocked', Progress: 'In progress' },
});

const records = reactive([
  { id: 'tokens', task: 'Design tokens', owner: 'Mina', area: 'Visual system', target: 'Sep 04', risk: 'Low', status: 'Ready' },
  { id: 'keyboard', task: 'Keyboard QA', owner: 'Alex', area: 'Accessibility', target: 'Sep 05', risk: 'Medium', status: 'Review' },
  { id: 'docs', task: 'Migration guide', owner: 'Jules', area: 'Documentation', target: 'Sep 06', risk: 'High', status: 'Blocked' },
  { id: 'release', task: 'Release notes', owner: 'Sam', area: 'Documentation', target: 'Sep 06', risk: 'Low', status: 'Ready' },
  { id: 'bundle', task: 'Bundle budget', owner: 'Noor', area: 'Performance', target: 'Sep 07', risk: 'Medium', status: 'Progress' },
  { id: 'contrast', task: 'Contrast audit', owner: 'Mina', area: 'Accessibility', target: 'Sep 07', risk: 'Low', status: 'Ready' },
  { id: 'api', task: 'API compatibility', owner: 'Chen', area: 'Core', target: 'Sep 08', risk: 'High', status: 'Review' },
  { id: 'canary', task: 'Canary rollout', owner: 'Iris', area: 'Delivery', target: 'Sep 09', risk: 'Medium', status: 'Progress' },
]);
interface ReleaseCells {
  readonly task: string;
  readonly owner: string;
  readonly area: string;
  readonly target: string;
  readonly risk: string;
  readonly status: string;
}
const columns = defineDataGridColumns([
  { id: 'task', label: 'Task', capabilities: ['sort', 'edit'] },
  { id: 'owner', label: 'Owner', capabilities: ['sort', 'edit'] },
  { id: 'area', label: 'Area', capabilities: ['sort', 'edit'] },
  { id: 'target', label: 'Target', capabilities: ['sort', 'edit'] },
  { id: 'risk', label: 'Risk', capabilities: ['sort', 'edit'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'edit'] },
]);
let viewRevision = 0;
const grid = useDataGrid<ReleaseCells>({ columns });
const DataGrid = createDataGridComponents(grid);
const gridRoot = ref<DataGridRootExpose<ReleaseCells> | null>(null);
useDataGridSource(grid, (request): DataGridViewResponse<ReleaseCells> => {
  let result = [...records];
  const sort = request.query.sort[0];
  if (sort !== undefined) result.sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { task: record.task, owner: record.owner, area: record.area, target: record.target, risk: record.risk, status: record.status } }));
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
  gridRoot.value?.refresh();
};
const handleCommand = (command: DataGridCommand) => {
  if (command.type !== 'commit-edit') return;
  const record = records.find((item) => item.id === command.cell.rowID);
  if (record === undefined || typeof command.value !== 'string') return;
  if (command.cell.columnID === 'task') record.task = command.value;
  if (command.cell.columnID === 'owner') record.owner = command.value;
  if (command.cell.columnID === 'area') record.area = command.value;
  if (command.cell.columnID === 'target') record.target = command.value;
  if (command.cell.columnID === 'risk') record.risk = command.value;
  if (command.cell.columnID === 'status') record.status = command.value;
  grid.requestView();
};
</script>

<template>
  <section class="tabular-demo tabular-demo--grid" :aria-label="copy.title">
    <header class="tabular-demo__toolbar">
      <div class="tabular-demo__title"><span><TableCellsSplit :size="18" aria-hidden="true" /></span><div><strong id="tabular-data-grid-demo-title">{{ copy.title }}</strong><small>{{ copy.subtitle }} · {{ records.length }}{{ isKorean ? '개 항목' : ' items' }}</small></div></div>
      <button class="tabular-demo__action" type="button" @click="beginFirstEdit"><PencilLine :size="15" aria-hidden="true" />{{ copy.edit }}</button>
    </header>
    <DataGrid.Provider>
      <div class="tabular-demo__viewport">
        <DataGrid.Root ref="gridRoot" class="tabular-grid" aria-labelledby="tabular-data-grid-demo-title" @command="handleCommand">
          <DataGrid.Header>
            <DataGrid.HeaderRow>
              <DataGrid.ColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">
                <DataGrid.SortTrigger :column="column.id">{{ copy.columns[index] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger>
              </DataGrid.ColumnHeader>
            </DataGrid.HeaderRow>
          </DataGrid.Header>
          <DataGrid.Body v-slot="{ row }">
            <DataGrid.Cell v-for="column in columns" :key="column.id" :column="column.id" v-slot="{ editState }">
              <DataGrid.RowSelectionControl v-if="column.id === 'task'" v-slot="{ rowSelection }" as-child name="release-items" :aria-label="`Select ${row.cells.task}`">
                <DocsCheckbox :model-value="rowSelectionValue(rowSelection, row.id)" />
              </DataGrid.RowSelectionControl>
              <span v-if="!isEditing(editState, row.id, column.id)" :class="{ 'tabular-demo__status': column.id === 'status' }" :data-tone="column.id === 'status' ? row.cells.status : undefined">{{ column.id === 'status' ? copy.status[row.cells.status as keyof typeof copy.status] : row.cells[column.id] }}</span>
              <DataGrid.Editor :column="column.id" :value="row.cells[column.id]" :aria-label="`Edit ${column.id} for ${row.id}`" />
            </DataGrid.Cell>
          </DataGrid.Body>
        </DataGrid.Root>
      </div>
    </DataGrid.Provider>
    <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong><CheckCircle2 :size="15" aria-hidden="true" />{{ selectedCount }}{{ isKorean ? '개 행 선택' : ' rows selected' }}</strong></footer>
  </section>
</template>
