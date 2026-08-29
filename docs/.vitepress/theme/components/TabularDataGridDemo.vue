<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import { ArrowDownUp, CheckCircle2, PencilLine, TableCellsSplit } from '@lucide/vue';
import {
  createDataGridComponents,
  useDataGrid,
  type DataGridCommand,
  type DataGridEditState,
  type DataGridRootExpose,
  type DataGridViewResponse,
} from '@sectile/vue/data-grid';
import { useDocsLocale } from '../locale.js';
import { rowSelectionValue } from '../tabular-selection.js';
import DocsButton from './DocsButton.vue';
import DocsCheckbox from './DocsCheckbox.vue';
import DocsDemoFooter from './DocsDemoFooter.vue';
import DocsDemoHeader from './DocsDemoHeader.vue';
import DocsInlineEditor from './DocsInlineEditor.vue';
import DocsStatusBadge from './DocsStatusBadge.vue';
import '../tabular-docs.css';

const props = withDefaults(defineProps<{ focus?: 'overview' | 'navigation' | 'editing' | 'selection' }>(), { focus: 'overview' });
const titleID = `tabular-data-grid-demo-${useId()}`;

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '출시 준비 보드', subtitle: '셀을 이동하며 릴리스 항목을 바로 편집', columns: ['작업', '담당자', '영역', '목표일', '위험도', '상태'],
  hint: 'Shift로 행 범위 선택 · 방향키 이동 · Enter 편집 · Escape 취소', edit: '첫 셀 편집', selectRow: (value: string) => `${value} 행 선택`, editCell: (column: string, row: string) => `${row}의 ${column} 편집`,
  status: { Ready: '준비', Review: '검토', Blocked: '차단', Progress: '진행 중' },
} : {
  title: 'Release readiness', subtitle: 'Move through cells and edit release work in place', columns: ['Work item', 'Owner', 'Area', 'Target', 'Risk', 'Status'],
  hint: 'Shift-select a row range · Arrow keys move · Enter edits · Escape cancels', edit: 'Edit first cell', selectRow: (value: string) => `Select ${value} row`, editCell: (column: string, row: string) => `Edit ${column} for ${row}`,
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
const sourceColumns = [
  { id: 'task', label: 'Task', capabilities: ['sort', 'edit'] },
  { id: 'owner', label: 'Owner', capabilities: ['sort', 'edit'] },
  { id: 'area', label: 'Area', capabilities: ['sort', 'edit'] },
  { id: 'target', label: 'Target', capabilities: ['sort', 'edit'] },
  { id: 'risk', label: 'Risk', capabilities: ['sort', 'edit'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'edit'] },
] as const;
let viewRevision = 0;
const grid = useDataGrid({ source: (request): DataGridViewResponse<ReleaseCells> => {
  let result = [...records];
  const sort = request.query.sort[0];
  if (sort !== undefined) result.sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { task: record.task, owner: record.owner, area: record.area, target: record.target, risk: record.risk, status: record.status } }));
  return {
    protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision, expansionRevision: request.expansionRevision,
    viewRevision: ++viewRevision, access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length },
    rows, columnSchema: { revision: request.columnSchemaRevision, columns: sourceColumns, headers: [] }, removedRowIDs: [],
  };
} });
const DataGrid = createDataGridComponents(grid);
const gridRoot = ref<DataGridRootExpose<ReleaseCells> | null>(null);

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
const statusIntent = (status: string) => status === 'Ready' ? 'success' : status === 'Blocked' ? 'critical' : 'warning';
const focusState = computed(() => {
  void grid.snapshot.value;
  const snapshot = grid.getSnapshot();
  if (props.focus === 'navigation') return JSON.stringify(snapshot.cursor);
  if (props.focus === 'editing') return JSON.stringify(snapshot.edit);
  if (props.focus === 'selection') return JSON.stringify(snapshot.tabular.state.rowSelection);
  return JSON.stringify({ cursor: snapshot.cursor.current, selected: snapshot.tabular.state.rowSelection });
});
const focusLabel = computed(() => ({
  overview: isKorean.value ? '요약' : 'Overview',
  navigation: isKorean.value ? '현재 셀' : 'Active cell',
  editing: isKorean.value ? '편집 상태' : 'Edit state',
  selection: isKorean.value ? '선택 상태' : 'Selection state',
})[props.focus]);
</script>

<template>
  <section class="tabular-demo tabular-demo--grid" :aria-label="copy.title">
    <DocsDemoHeader
      :title-id="titleID"
      :title="copy.title"
      :subtitle="copy.subtitle"
      :meta="`${records.length}${isKorean ? '개 항목' : ' items'}`"
    >
      <template #icon><TableCellsSplit :size="18" aria-hidden="true" /></template>
      <template #action><DocsButton class="tabular-demo__action" @click="beginFirstEdit"><PencilLine :size="15" aria-hidden="true" />{{ copy.edit }}</DocsButton></template>
    </DocsDemoHeader>
    <div class="tabular-demo__witness" aria-live="polite"><span>{{ focusLabel }}</span><code>{{ focusState }}</code></div>
    <DataGrid.Provider>
      <div class="tabular-demo__viewport">
        <DataGrid.Root ref="gridRoot" class="tabular-grid" :aria-labelledby="titleID" @command="handleCommand">
          <DataGrid.Header>
            <DataGrid.HeaderRow>
              <DataGrid.ColumnHeader column="task"><DataGrid.SortTrigger column="task">{{ copy.columns[0] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
              <DataGrid.ColumnHeader column="owner"><DataGrid.SortTrigger column="owner">{{ copy.columns[1] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
              <DataGrid.ColumnHeader column="area"><DataGrid.SortTrigger column="area">{{ copy.columns[2] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
              <DataGrid.ColumnHeader column="target"><DataGrid.SortTrigger column="target">{{ copy.columns[3] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
              <DataGrid.ColumnHeader column="risk"><DataGrid.SortTrigger column="risk">{{ copy.columns[4] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
              <DataGrid.ColumnHeader column="status"><DataGrid.SortTrigger column="status">{{ copy.columns[5] }}<ArrowDownUp :size="14" aria-hidden="true" /></DataGrid.SortTrigger></DataGrid.ColumnHeader>
            </DataGrid.HeaderRow>
          </DataGrid.Header>
          <DataGrid.Body v-slot="{ row }">
            <DataGrid.Cell column="task" v-slot="{ editState }">
              <DataGrid.RowSelectionControl v-slot="{ rowSelection }" as-child name="release-items" :aria-label="copy.selectRow(row.cells.task)">
                <DocsCheckbox :model-value="rowSelectionValue(rowSelection, row.id)" />
              </DataGrid.RowSelectionControl>
              <span v-if="!isEditing(editState, row.id, 'task')">{{ row.cells.task }}</span>
              <DataGrid.Editor as-child column="task"><DocsInlineEditor :value="row.cells.task" :aria-label="copy.editCell('task', row.cells.task)" /></DataGrid.Editor>
            </DataGrid.Cell>
            <DataGrid.Cell column="owner" v-slot="{ editState }"><span v-if="!isEditing(editState, row.id, 'owner')">{{ row.cells.owner }}</span><DataGrid.Editor as-child column="owner"><DocsInlineEditor :value="row.cells.owner" :aria-label="copy.editCell('owner', row.cells.task)" /></DataGrid.Editor></DataGrid.Cell>
            <DataGrid.Cell column="area" v-slot="{ editState }"><span v-if="!isEditing(editState, row.id, 'area')">{{ row.cells.area }}</span><DataGrid.Editor as-child column="area"><DocsInlineEditor :value="row.cells.area" :aria-label="copy.editCell('area', row.cells.task)" /></DataGrid.Editor></DataGrid.Cell>
            <DataGrid.Cell column="target" v-slot="{ editState }"><span v-if="!isEditing(editState, row.id, 'target')">{{ row.cells.target }}</span><DataGrid.Editor as-child column="target"><DocsInlineEditor :value="row.cells.target" :aria-label="copy.editCell('target', row.cells.task)" /></DataGrid.Editor></DataGrid.Cell>
            <DataGrid.Cell column="risk" v-slot="{ editState }"><span v-if="!isEditing(editState, row.id, 'risk')">{{ row.cells.risk }}</span><DataGrid.Editor as-child column="risk"><DocsInlineEditor :value="row.cells.risk" :aria-label="copy.editCell('risk', row.cells.task)" /></DataGrid.Editor></DataGrid.Cell>
            <DataGrid.Cell column="status" v-slot="{ editState }"><DocsStatusBadge v-if="!isEditing(editState, row.id, 'status')" :intent="statusIntent(row.cells.status)">{{ copy.status[row.cells.status as keyof typeof copy.status] }}</DocsStatusBadge><DataGrid.Editor as-child column="status"><DocsInlineEditor :value="row.cells.status" :aria-label="copy.editCell('status', row.cells.task)" /></DataGrid.Editor></DataGrid.Cell>
          </DataGrid.Body>
        </DataGrid.Root>
      </div>
    </DataGrid.Provider>
    <DocsDemoFooter>
      {{ copy.hint }}
      <template #summary><CheckCircle2 :size="15" aria-hidden="true" />{{ selectedCount }}{{ isKorean ? '개 행 선택' : ' rows selected' }}</template>
    </DocsDemoFooter>
  </section>
</template>
