<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownUp, Search, Users } from '@lucide/vue';
import {
  DataTableBody,
  DataTableBulkSelectionControl,
  DataTableCaption,
  DataTableCell,
  DataTableColumnHeader,
  DataTableFilterControl,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableProvider,
  DataTableRoot,
  DataTableRow,
  DataTableSelectionControl,
  DataTableSortTrigger,
  defineDataTableColumns,
  useDataTable,
  useDataTableSource,
  type DataTableViewResponse,
} from '@sectile/vue/data-table';
import { useDocsLocale } from '../locale.js';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '팀 디렉터리', caption: '팀 구성원과 권한', search: '이름이나 역할 검색', selectAll: '검색 결과 전체 선택', selected: '명 선택',
  columns: ['이름', '역할', '상태'], status: { active: '활성', away: '자리 비움' }, hint: '열 제목을 눌러 정렬하고 행을 선택해 보세요.',
} : {
  title: 'Team directory', caption: 'Team members and permissions', search: 'Search name or role', selectAll: 'Select all matching', selected: 'selected',
  columns: ['Name', 'Role', 'Status'], status: { active: 'Active', away: 'Away' }, hint: 'Sort from a column heading, filter, and select rows.',
});

const records = [
  { id: 'ada', name: 'Ada Lovelace', role: 'Platform', status: 'active' },
  { id: 'grace', name: 'Grace Hopper', role: 'Compiler', status: 'active' },
  { id: 'margaret', name: 'Margaret Hamilton', role: 'Flight software', status: 'away' },
  { id: 'radia', name: 'Radia Perlman', role: 'Network', status: 'active' },
];
const columns = defineDataTableColumns([
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter'] },
  { id: 'role', label: 'Role', capabilities: ['sort', 'filter'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'filter'] },
]);
let viewRevision = 0;

const table = useDataTable({ columns });
const source = useDataTableSource(table, (request): DataTableViewResponse => {
  const filter = request.query.filters.find((entry) => entry.enabled !== false)?.value;
  const needle = typeof filter === 'string' ? filter.trim().toLocaleLowerCase() : '';
  let result = records.filter((record) => `${record.name} ${record.role} ${record.status}`.toLocaleLowerCase().includes(needle));
  const sort = request.query.sort[0];
  if (sort !== undefined) {
    result = [...result].sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  }
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { name: record.name, role: record.role, status: record.status } }));
  return {
    protocolVersion: 1, requestID: request.requestID, sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision, expansionRevision: request.expansionRevision,
    viewRevision: ++viewRevision, access: request.access,
    matchingLeafCount: { kind: 'known', value: rows.length }, visibleRowCount: { kind: 'known', value: rows.length },
    rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] }, removedRowIDs: [],
  };
});

const rows = computed(() => {
  const accepted = table.acceptedViewState.value;
  return accepted.kind === 'none' ? [] : accepted.view.rows.filter((row) => row.kind === 'leaf');
});
const selectedCount = computed(() => {
  void table.snapshot.value;
  const selection = table.getProjection().rowSelection;
  return selection.kind === 'explicit-rows' ? selection.rowIDs.length : Math.max(0, rows.value.length - selection.excludedRowIDs.length);
});
const direction = (columnID: string) => {
  const snapshot = table.getSnapshot();
  return snapshot.state.query.sort.find((item) => item.columnID === columnID)?.direction;
};
</script>

<template>
  <DataTableProvider :controller="table">
    <section class="tabular-demo tabular-demo--table" :aria-label="copy.title">
      <header class="tabular-demo__toolbar">
        <div class="tabular-demo__title"><span><Users :size="18" aria-hidden="true" /></span><div><strong>{{ copy.title }}</strong><small>{{ records.length }} records</small></div></div>
        <label class="tabular-demo__search"><Search :size="16" aria-hidden="true" /><DataTableFilterControl scope="global" id="directory-search" predicate="contains" :placeholder="copy.search" :aria-label="copy.search" /></label>
      </header>

      <div class="tabular-demo__viewport">
        <DataTableRoot aria-label="Team directory" class="tabular-table">
          <DataTableCaption class="sr-only">{{ copy.caption }}</DataTableCaption>
          <DataTableHeader>
            <DataTableHeaderRow :depth="0">
              <th class="tabular-table__select"><DataTableBulkSelectionControl :target="{ kind: 'all-matching' }" :aria-label="copy.selectAll"><span aria-hidden="true">✓</span></DataTableBulkSelectionControl></th>
              <DataTableColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">
                <DataTableSortTrigger :columnID="column.id">
                  {{ copy.columns[index] }}<ArrowDownUp :size="14" aria-hidden="true" /><span class="sr-only">{{ direction(column.id) }}</span>
                </DataTableSortTrigger>
              </DataTableColumnHeader>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            <DataTableRow v-for="row in rows" :key="row.id" :rowID="row.id">
              <td class="tabular-table__select"><DataTableSelectionControl :rowID="row.id" name="team-members" :value="row.id" :aria-label="`Select ${row.cells['name']}`" /></td>
              <DataTableCell :rowID="row.id" columnID="name"><strong>{{ row.cells['name'] }}</strong></DataTableCell>
              <DataTableCell :rowID="row.id" columnID="role">{{ row.cells['role'] }}</DataTableCell>
              <DataTableCell :rowID="row.id" columnID="status"><span class="tabular-demo__status" :data-tone="row.cells['status']">{{ copy.status[row.cells['status'] as keyof typeof copy.status] }}</span></DataTableCell>
            </DataTableRow>
            <tr v-if="rows.length === 0"><td colspan="4" class="tabular-demo__empty">{{ source.status.value === 'loading' ? 'Loading…' : 'No matching rows' }}</td></tr>
          </DataTableBody>
        </DataTableRoot>
      </div>
      <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong>{{ selectedCount }} {{ copy.selected }}</strong></footer>
    </section>
  </DataTableProvider>
</template>
