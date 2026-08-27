<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { ChevronRight, PencilLine, Workflow } from '@lucide/vue';
import {
  DataTreeGridBody,
  DataTreeGridCell,
  DataTreeGridColumnHeader,
  DataTreeGridEditor,
  DataTreeGridHeader,
  DataTreeGridHeaderRow,
  DataTreeGridProvider,
  DataTreeGridRoot,
  DataTreeGridRow,
  DataTreeGridRowDisclosure,
  DataTreeGridRowSelectionControl,
  defineDataTreeGridColumns,
  useDataTreeGrid,
  useDataTreeGridSource,
  type DataTreeGridCommand,
  type DataTreeGridEditState,
  type DataTreeGridRootExpose,
  type DataTreeGridViewResponse,
} from '@sectile/vue/data-tree-grid';
import { useDocsLocale } from '../locale.js';
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
const columns = defineDataTreeGridColumns([
  { id: 'name', label: 'Service', capabilities: ['edit'] },
  { id: 'owner', label: 'Owner', capabilities: ['edit'] },
  { id: 'tier', label: 'Tier', capabilities: ['edit'] },
  { id: 'region', label: 'Region', capabilities: ['edit'] },
  { id: 'status', label: 'Status', capabilities: ['edit'] },
]);
let viewRevision = 0;
const tree = useDataTreeGrid({ columns, defaultExpansion: ['commerce', 'experience', 'foundation'] });
const treeRoot = ref<DataTreeGridRootExpose | null>(null);
useDataTreeGridSource(tree, (request): DataTreeGridViewResponse => {
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
</script>

<template>
  <section class="tabular-demo tabular-demo--tree" :aria-label="copy.title">
    <header class="tabular-demo__toolbar">
      <div class="tabular-demo__title"><span><Workflow :size="18" aria-hidden="true" /></span><div><strong>{{ copy.title }}</strong><small>{{ copy.subtitle }} · {{ records.length }}{{ isKorean ? '개 서비스' : ' services' }}</small></div></div>
      <button class="tabular-demo__action" type="button" @click="beginFirstEdit"><PencilLine :size="15" aria-hidden="true" />{{ copy.edit }}</button>
    </header>
    <DataTreeGridProvider :controller="tree">
      <div class="tabular-demo__viewport">
        <DataTreeGridRoot ref="treeRoot" class="tabular-grid tabular-tree-grid" :aria-label="copy.title" @command="handleCommand">
          <DataTreeGridHeader><DataTreeGridHeaderRow :depth="0"><DataTreeGridColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">{{ copy.columns[index] }}</DataTreeGridColumnHeader></DataTreeGridHeaderRow></DataTreeGridHeader>
          <DataTreeGridBody>
            <DataTreeGridRow v-for="row in rows" :key="row.id" :rowID="row.id" :class="{ 'is-group': row.kind === 'group' }">
              <DataTreeGridCell v-for="column in columns" :key="`${row.id}:${column.id}`" :rowID="row.id" :columnID="column.id" v-slot="{ editState }">
                <template v-if="column.id === 'name'">
                  <DataTreeGridRowDisclosure v-if="row.kind === 'group'" :rowID="row.id" :aria-label="`Toggle ${row.cells['name']}`"><ChevronRight :size="16" aria-hidden="true" /></DataTreeGridRowDisclosure>
                  <span v-else class="tabular-tree-grid__indent" aria-hidden="true" />
                  <DataTreeGridRowSelectionControl v-if="row.kind === 'leaf'" :rowID="row.id" name="services" :value="row.id" :aria-label="`Select ${row.cells['name']}`" />
                </template>
                <strong v-if="row.kind === 'group' && column.id === 'name'">{{ row.cells['name'] }}</strong>
                <span v-else-if="!isEditing(editState, row.id, column.id)" :class="{ 'tabular-demo__status': column.id === 'status' && row.kind === 'leaf' }" :data-tone="column.id === 'status' ? row.cells['status'] : undefined">{{ column.id === 'status' && row.kind === 'leaf' ? copy.status[row.cells['status'] as keyof typeof copy.status] : row.cells[column.id] }}</span>
                <DataTreeGridEditor v-if="row.kind === 'leaf'" :rowID="row.id" :columnID="column.id" :value="row.cells[column.id]" :aria-label="`Edit ${column.id} for ${row.id}`" />
              </DataTreeGridCell>
            </DataTreeGridRow>
          </DataTreeGridBody>
        </DataTreeGridRoot>
      </div>
    </DataTreeGridProvider>
    <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong>{{ rows.length }}{{ isKorean ? '개 행 표시' : ' visible rows' }}</strong></footer>
  </section>
</template>
