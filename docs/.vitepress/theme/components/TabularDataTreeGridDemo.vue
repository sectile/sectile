<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ChevronRight, PencilLine, Workflow } from '@lucide/vue';
import {
  createDataTreeGridComponents,
  defineDataTreeGridColumns,
  useDataTreeGrid,
  useDataTreeGridSource,
  type DataTreeGridCommand,
  type DataTreeGridEditState,
  type DataTreeGridRootExpose,
  type DataTreeGridViewResponse,
} from '@sectile/vue/tabular';
import { useDocsLocale } from '../locale.js';
import { rowSelectionValue } from '../tabular-selection.js';
import DocsButton from './DocsButton.vue';
import DocsCheckbox from './DocsCheckbox.vue';
import DocsDemoFooter from './DocsDemoFooter.vue';
import DocsDemoHeader from './DocsDemoHeader.vue';
import DocsInlineEditor from './DocsInlineEditor.vue';
import DocsStatusBadge from './DocsStatusBadge.vue';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '서비스 소유권', subtitle: '도메인과 서비스의 계층을 한 grid에서 관리', columns: ['서비스', '담당자', '등급', '리전', '상태'],
  hint: '그룹 펼침·접기 · leaf 선택 · 셀 이동 · leaf 편집', edit: '첫 서비스 편집',
  status: { Healthy: '정상', Review: '검토', Planned: '계획', Incident: '장애 대응' },
} : {
  title: 'Service ownership', subtitle: 'Manage domains and services in one hierarchy', columns: ['Service', 'Owner', 'Tier', 'Region', 'Status'],
  hint: 'Expand groups · select leaves · move between cells · edit leaves', edit: 'Edit first service',
  status: { Healthy: 'Healthy', Review: 'Review', Planned: 'Planned', Incident: 'Incident' },
});

const records = reactive([
  { id: 'storefront', parent: 'commerce', name: 'Storefront', owner: 'Mina', tier: 'Tier 1', region: 'Global', status: 'Healthy' },
  { id: 'checkout', parent: 'commerce', name: 'Checkout', owner: 'Alex', tier: 'Tier 0', region: 'Global', status: 'Review' },
  { id: 'catalog', parent: 'commerce', name: 'Catalog API', owner: 'Noor', tier: 'Tier 1', region: 'EU · US', status: 'Healthy' },
  { id: 'docs', parent: 'experience', name: 'Documentation', owner: 'Jules', tier: 'Tier 2', region: 'Global', status: 'Healthy' },
  { id: 'labs', parent: 'experience', name: 'Component labs', owner: 'Sam', tier: 'Tier 3', region: 'US', status: 'Planned' },
  { id: 'playground', parent: 'experience', name: 'Playground', owner: 'Iris', tier: 'Tier 2', region: 'Global', status: 'Review' },
  { id: 'auth', parent: 'foundation', name: 'Identity gateway', owner: 'Chen', tier: 'Tier 0', region: 'Global', status: 'Incident' },
  { id: 'events', parent: 'foundation', name: 'Event pipeline', owner: 'Radia', tier: 'Tier 1', region: 'EU · US', status: 'Healthy' },
  { id: 'observability', parent: 'foundation', name: 'Observability', owner: 'Grace', tier: 'Tier 1', region: 'Global', status: 'Review' },
]);
const groups = [
  { id: 'commerce', name: 'Commerce', owner: '3 services' },
  { id: 'experience', name: 'Developer experience', owner: '3 services' },
  { id: 'foundation', name: 'Platform foundation', owner: '3 services' },
];
interface ServiceCells {
  readonly name: string;
  readonly owner: string;
  readonly tier: string;
  readonly region: string;
  readonly status: string;
}
const columns = defineDataTreeGridColumns([
  { id: 'name', label: 'Service', capabilities: ['edit'] },
  { id: 'owner', label: 'Owner', capabilities: ['edit'] },
  { id: 'tier', label: 'Tier', capabilities: ['edit'] },
  { id: 'region', label: 'Region', capabilities: ['edit'] },
  { id: 'status', label: 'Status', capabilities: ['edit'] },
]);
let viewRevision = 0;
const tree = useDataTreeGrid<ServiceCells>({ columns, defaultExpansion: ['commerce', 'experience', 'foundation'] });
const DataTreeGrid = createDataTreeGridComponents(tree);
const treeRoot = ref<DataTreeGridRootExpose<ServiceCells> | null>(null);
useDataTreeGridSource(tree, (request): DataTreeGridViewResponse<ServiceCells> => {
  const rows = groups.flatMap((group) => {
    const expanded = request.expansion.includes(group.id);
    const parent = { kind: 'group' as const, id: group.id, parentGroupID: null, depth: 0, expanded, cells: { name: group.name, owner: group.owner, tier: '', region: '', status: '' } };
    const children = expanded ? records.filter((record) => record.parent === group.id).map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { name: record.name, owner: record.owner, tier: record.tier, region: record.region, status: record.status } })) : [];
    return [parent, ...children];
  });
  return {
    protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision, expansionRevision: request.expansionRevision,
    viewRevision: ++viewRevision, access: request.access,
    matchingLeafCount: { kind: 'known', value: records.length }, visibleRowCount: { kind: 'known', value: rows.length },
    rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [],
  };
});

const rows = computed(() => {
  const accepted = tree.acceptedViewState.value;
  return accepted.kind === 'none' ? [] : accepted.view.rows;
});
const isEditing = (state: DataTreeGridEditState, rowID: string, columnID: string) => state.kind === 'editing' && state.cell.rowID === rowID && state.cell.columnID === columnID;
const beginFirstEdit = () => {
  const cell = { rowID: 'storefront', columnID: 'name' };
  tree.dispatch({ type: 'focus-cell', cell });
  tree.dispatch({ type: 'begin-edit', cell });
  treeRoot.value?.refresh();
};
const handleCommand = (command: DataTreeGridCommand) => {
  if (command.type !== 'commit-edit') return;
  const record = records.find((item) => item.id === command.cell.rowID);
  if (record === undefined || typeof command.value !== 'string') return;
  if (command.cell.columnID === 'name') record.name = command.value;
  if (command.cell.columnID === 'owner') record.owner = command.value;
  if (command.cell.columnID === 'tier') record.tier = command.value;
  if (command.cell.columnID === 'region') record.region = command.value;
  if (command.cell.columnID === 'status') record.status = command.value;
  tree.requestView();
};
const statusIntent = (status: string) => status === 'Healthy' ? 'success' : status === 'Incident' ? 'critical' : 'warning';
</script>

<template>
  <section class="tabular-demo tabular-demo--tree" :aria-label="copy.title">
    <DocsDemoHeader
      title-id="tabular-data-tree-grid-demo-title"
      :title="copy.title"
      :subtitle="copy.subtitle"
      :meta="`${records.length}${isKorean ? '개 서비스' : ' services'}`"
    >
      <template #icon><Workflow :size="18" aria-hidden="true" /></template>
      <template #action><DocsButton class="tabular-demo__action" @click="beginFirstEdit"><PencilLine :size="15" aria-hidden="true" />{{ copy.edit }}</DocsButton></template>
    </DocsDemoHeader>
    <DataTreeGrid.Provider>
      <div class="tabular-demo__viewport">
        <DataTreeGrid.Root ref="treeRoot" class="tabular-grid tabular-tree-grid" aria-labelledby="tabular-data-tree-grid-demo-title" @command="handleCommand">
          <DataTreeGrid.Header><DataTreeGrid.HeaderRow><DataTreeGrid.ColumnHeader v-for="(column, index) in columns" :key="column.id" :column="column.id">{{ copy.columns[index] }}</DataTreeGrid.ColumnHeader></DataTreeGrid.HeaderRow></DataTreeGrid.Header>
          <DataTreeGrid.Body v-slot="{ row }">
            <DataTreeGrid.Cell v-for="column in columns" :key="column.id" :column="column.id" v-slot="{ editState }">
              <template v-if="column.id === 'name'">
                <DataTreeGrid.RowDisclosure v-if="row.kind === 'group'" as-child :aria-label="`Toggle ${row.cells.name}`">
                  <DocsButton appearance="ghost" icon-only><ChevronRight :size="16" aria-hidden="true" /></DocsButton>
                </DataTreeGrid.RowDisclosure>
                <span v-else class="tabular-tree-grid__indent" aria-hidden="true" />
                <DataTreeGrid.RowSelectionControl v-if="row.kind === 'leaf'" v-slot="{ rowSelection }" as-child name="services" :aria-label="`Select ${row.cells.name}`">
                  <DocsCheckbox :model-value="rowSelectionValue(rowSelection, row.id)" />
                </DataTreeGrid.RowSelectionControl>
              </template>
              <strong v-if="row.kind === 'group' && column.id === 'name'">{{ row.cells.name }}</strong>
              <DocsStatusBadge v-else-if="column.id === 'status' && row.kind === 'leaf' && !isEditing(editState, row.id, column.id)" :intent="statusIntent(row.cells.status)">{{ copy.status[row.cells.status as keyof typeof copy.status] }}</DocsStatusBadge>
              <span v-else-if="!isEditing(editState, row.id, column.id)">{{ row.cells[column.id] }}</span>
              <DataTreeGrid.Editor v-if="row.kind === 'leaf'" as-child :column="column.id">
                <DocsInlineEditor :value="row.cells[column.id]" :aria-label="`Edit ${column.id} for ${row.id}`" />
              </DataTreeGrid.Editor>
            </DataTreeGrid.Cell>
          </DataTreeGrid.Body>
        </DataTreeGrid.Root>
      </div>
    </DataTreeGrid.Provider>
    <DocsDemoFooter>
      {{ copy.hint }}
      <template #summary>{{ rows.length }}{{ isKorean ? '개 행 표시' : ' visible rows' }}</template>
    </DocsDemoFooter>
  </section>
</template>
