<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownUp, Search, Table2 } from '@lucide/vue';
import {
  defineDataTableColumns,
  useDataTable,
  useDataTableComponents,
  useDataTableSource,
  type DataTableViewResponse,
} from '@sectile/vue/data-table';
import { useDocsLocale } from '../locale.js';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '팀 디렉터리', subtitle: '구성원과 접근 권한을 한눈에 비교', search: '이름, 팀, 역할 검색', selectAll: '검색 결과 전체 선택',
  columns: ['이름', '팀', '역할', '근무지', '상태'], status: { active: '활성', away: '자리 비움', offline: '오프라인' }, hint: '검색 · 열 정렬 · 개별 선택 · 검색 결과 전체 선택',
} : {
  title: 'Team directory', subtitle: 'Compare members and access at a glance', search: 'Search name, team, or role', selectAll: 'Select all matching',
  columns: ['Name', 'Team', 'Role', 'Location', 'Status'], status: { active: 'Active', away: 'Away', offline: 'Offline' }, hint: 'Search · sort columns · select rows · select all matching',
});

interface DirectoryCells {
  readonly name: string;
  readonly team: string;
  readonly role: string;
  readonly location: string;
  readonly status: 'active' | 'away' | 'offline';
}
interface DirectoryRecord extends DirectoryCells { readonly id: string }

const records: readonly DirectoryRecord[] = [
  { id: 'ada', name: 'Ada Lovelace', team: 'Platform', role: 'Staff engineer', location: 'London', status: 'active' },
  { id: 'grace', name: 'Grace Hopper', team: 'Compiler', role: 'Tech lead', location: 'New York', status: 'active' },
  { id: 'margaret', name: 'Margaret Hamilton', team: 'Reliability', role: 'Principal', location: 'Boston', status: 'away' },
  { id: 'radia', name: 'Radia Perlman', team: 'Network', role: 'Architect', location: 'Seattle', status: 'active' },
  { id: 'annie', name: 'Annie Easley', team: 'Infrastructure', role: 'Engineer', location: 'Cleveland', status: 'offline' },
  { id: 'katherine', name: 'Katherine Johnson', team: 'Analytics', role: 'Staff analyst', location: 'Hampton', status: 'active' },
  { id: 'mary', name: 'Mary Jackson', team: 'Research', role: 'Engineering lead', location: 'Hampton', status: 'away' },
  { id: 'barbara', name: 'Barbara Liskov', team: 'Runtime', role: 'Distinguished', location: 'Cambridge', status: 'active' },
  { id: 'adele', name: 'Adele Goldberg', team: 'Developer tools', role: 'Product engineer', location: 'Palo Alto', status: 'offline' },
  { id: 'frances', name: 'Frances Allen', team: 'Compiler', role: 'Advisor', location: 'Remote', status: 'active' },
];
const columns = defineDataTableColumns([
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter'] },
  { id: 'team', label: 'Team', capabilities: ['sort', 'filter'] },
  { id: 'role', label: 'Role', capabilities: ['sort', 'filter'] },
  { id: 'location', label: 'Location', capabilities: ['sort', 'filter'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'filter'] },
]);
let viewRevision = 0;

const table = useDataTable<DirectoryCells>({ columns });
const DataTable = useDataTableComponents(table);
const source = useDataTableSource(table, (request): DataTableViewResponse<DirectoryCells> => {
  const filter = request.query.filters.find((entry) => entry.enabled !== false)?.value;
  const needle = typeof filter === 'string' ? filter.trim().toLocaleLowerCase() : '';
  let result = records.filter((record) => `${record.name} ${record.team} ${record.role} ${record.location} ${record.status}`.toLocaleLowerCase().includes(needle));
  const sort = request.query.sort[0];
  if (sort !== undefined) {
    result = [...result].sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  }
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { name: record.name, team: record.team, role: record.role, location: record.location, status: record.status } }));
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
  <DataTable.Provider>
    <section class="tabular-demo tabular-demo--table" :aria-label="copy.title">
      <header class="tabular-demo__toolbar">
        <div class="tabular-demo__title"><span><Table2 :size="18" aria-hidden="true" /></span><div><strong>{{ copy.title }}</strong><small>{{ copy.subtitle }} · {{ records.length }}{{ isKorean ? '명' : ' people' }}</small></div></div>
        <label class="tabular-demo__search"><Search :size="16" aria-hidden="true" /><DataTable.FilterControl scope="global" id="directory-search" predicate="contains" :placeholder="copy.search" :aria-label="copy.search" /></label>
      </header>

      <div class="tabular-demo__viewport">
        <DataTable.Root class="tabular-table">
          <DataTable.Caption class="sr-only">{{ copy.title }}</DataTable.Caption>
          <DataTable.Header>
            <DataTable.HeaderRow>
              <th class="tabular-table__select"><DataTable.BulkSelectionControl :target="{ kind: 'all-matching' }" :aria-label="copy.selectAll"><span aria-hidden="true">✓</span></DataTable.BulkSelectionControl></th>
              <DataTable.ColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">
                <DataTable.SortTrigger :column="column.id">
                  {{ copy.columns[index] }}<ArrowDownUp :size="14" aria-hidden="true" /><span class="sr-only">{{ direction(column.id) }}</span>
                </DataTable.SortTrigger>
              </DataTable.ColumnHeader>
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body>
            <template #default="{ row }">
              <td class="tabular-table__select"><DataTable.SelectionControl name="team-members" :aria-label="`Select ${row.cells.name}`" /></td>
              <DataTable.Cell column="name"><strong>{{ row.cells.name }}</strong></DataTable.Cell>
              <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
              <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
              <DataTable.Cell column="location">{{ row.cells.location }}</DataTable.Cell>
              <DataTable.Cell column="status"><span class="tabular-demo__status" :data-tone="row.cells.status">{{ copy.status[row.cells.status] }}</span></DataTable.Cell>
            </template>
            <template #empty><tr><td colspan="6" class="tabular-demo__empty">{{ source.status.value === 'loading' ? 'Loading…' : 'No matching rows' }}</td></tr></template>
          </DataTable.Body>
        </DataTable.Root>
      </div>
      <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong>{{ selectedCount }}{{ isKorean ? '명 선택' : ' selected' }}</strong></footer>
    </section>
  </DataTable.Provider>
</template>
