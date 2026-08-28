<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDown, ArrowUp, ChevronsUpDown, Search, Table2 } from '@lucide/vue';
import {
  createDataTableComponents,
  defineDataTableColumns,
  useDataTable,
  useDataTableSource,
  type DataTableViewResponse,
} from '@sectile/vue/data-table';
import { useDocsLocale } from '../locale.js';
import { bulkSelectionValue, rowSelectionValue } from '../tabular-selection.js';
import DocsCheckbox from './DocsCheckbox.vue';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '사용자 목록', subtitle: '소속, 역할과 계정 상태를 한눈에 확인', search: '이름, 소속 또는 역할 검색', selectAll: '검색 결과 전체 선택',
  columns: ['이름', '소속', '역할', '최근 활동', '상태'], status: { active: '사용 중', invited: '초대됨', suspended: '중지됨' },
  hint: '열 제목을 눌러 정렬 · 행 선택 · 검색 결과 전체 선택', loading: '불러오는 중…', empty: '검색 결과가 없습니다',
  count: (value: number) => `${value}명 표시`, selected: (value: number) => `${value}명 선택`, selectRow: (name: string) => `${name} 선택`,
} : {
  title: 'Users', subtitle: 'Compare teams, roles, and account status', search: 'Search name, team, or role', selectAll: 'Select all matching results',
  columns: ['Name', 'Team', 'Role', 'Last active', 'Status'], status: { active: 'Active', invited: 'Invited', suspended: 'Suspended' },
  hint: 'Select a column heading to sort · Select rows · Select all matching', loading: 'Loading…', empty: 'No matching users',
  count: (value: number) => `${value} shown`, selected: (value: number) => `${value} selected`, selectRow: (name: string) => `Select ${name}`,
});

interface UserCells {
  readonly name: string;
  readonly team: string;
  readonly role: string;
  readonly lastActive: string;
  readonly status: 'active' | 'invited' | 'suspended';
}
interface UserRecord extends UserCells { readonly id: string }

const records = computed<readonly UserRecord[]>(() => isKorean.value ? [
  { id: 'minseo', name: '김민서', team: '제품 플랫폼', role: '스태프 엔지니어', lastActive: '8월 28일', status: 'active' },
  { id: 'junho', name: '박준호', team: '컴파일러', role: '테크 리드', lastActive: '8월 28일', status: 'active' },
  { id: 'seoyun', name: '이서윤', team: '신뢰성', role: '수석 엔지니어', lastActive: '8월 27일', status: 'active' },
  { id: 'harin', name: '정하린', team: '데이터', role: '분석 엔지니어', lastActive: '초대 대기', status: 'invited' },
  { id: 'doyun', name: '최도윤', team: '인프라', role: '엔지니어', lastActive: '8월 26일', status: 'active' },
  { id: 'jiwoo', name: '한지우', team: '리서치', role: '엔지니어링 리드', lastActive: '8월 26일', status: 'active' },
  { id: 'seojun', name: '윤서준', team: '런타임', role: '프린시펄 엔지니어', lastActive: '8월 25일', status: 'active' },
  { id: 'yuna', name: '강유나', team: '개발 도구', role: '제품 엔지니어', lastActive: '8월 21일', status: 'suspended' },
] : [
  { id: 'maya', name: 'Maya Chen', team: 'Platform', role: 'Staff engineer', lastActive: 'Aug 28', status: 'active' },
  { id: 'elias', name: 'Elias Novak', team: 'Compiler', role: 'Tech lead', lastActive: 'Aug 28', status: 'active' },
  { id: 'amina', name: 'Amina Yusuf', team: 'Reliability', role: 'Principal engineer', lastActive: 'Aug 27', status: 'active' },
  { id: 'leo', name: 'Leo Martins', team: 'Data', role: 'Analytics engineer', lastActive: 'Invite pending', status: 'invited' },
  { id: 'priya', name: 'Priya Shah', team: 'Infrastructure', role: 'Engineer', lastActive: 'Aug 26', status: 'active' },
  { id: 'noah', name: 'Noah Kim', team: 'Research', role: 'Engineering lead', lastActive: 'Aug 26', status: 'active' },
  { id: 'sofia', name: 'Sofia Rossi', team: 'Runtime', role: 'Principal engineer', lastActive: 'Aug 25', status: 'active' },
  { id: 'omar', name: 'Omar Haddad', team: 'Developer tools', role: 'Product engineer', lastActive: 'Aug 21', status: 'suspended' },
]);
const columns = defineDataTableColumns([
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter'] },
  { id: 'team', label: 'Team', capabilities: ['sort', 'filter'] },
  { id: 'role', label: 'Role', capabilities: ['sort', 'filter'] },
  { id: 'lastActive', label: 'Last active', capabilities: ['sort', 'filter'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'filter'] },
]);
let viewRevision = 0;

const table = useDataTable<UserCells>({ columns });
const DataTable = createDataTableComponents(table);
const source = useDataTableSource(table, (request): DataTableViewResponse<UserCells> => {
  const filter = request.query.filters.find((entry) => entry.enabled !== false)?.value;
  const needle = typeof filter === 'string' ? filter.trim().toLocaleLowerCase() : '';
  let result = records.value.filter((record) => `${record.name} ${record.team} ${record.role} ${record.lastActive} ${record.status}`.toLocaleLowerCase().includes(needle));
  const sort = request.query.sort[0];
  if (sort !== undefined) {
    result = [...result].sort((left, right) => String(left[sort.columnID as keyof typeof left]).localeCompare(String(right[sort.columnID as keyof typeof right])) * (sort.direction === 'ascending' ? 1 : -1));
  }
  const rows = result.map((record) => ({ kind: 'leaf' as const, id: record.id, cells: { name: record.name, team: record.team, role: record.role, lastActive: record.lastActive, status: record.status } }));
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
        <div class="tabular-demo__title"><span><Table2 :size="18" aria-hidden="true" /></span><div><strong id="tabular-data-table-demo-title">{{ copy.title }}</strong><small>{{ copy.subtitle }} · {{ copy.count(records.length) }}</small></div></div>
        <label class="tabular-demo__search"><Search :size="16" aria-hidden="true" /><DataTable.FilterControl scope="global" id="user-search" predicate="contains" :placeholder="copy.search" :aria-label="copy.search" /></label>
      </header>

      <div class="tabular-demo__viewport">
        <DataTable.Root class="tabular-table" aria-labelledby="tabular-data-table-demo-title">
          <DataTable.Header>
            <DataTable.HeaderRow>
              <th class="tabular-table__select">
                <DataTable.BulkSelectionControl v-slot="{ rowSelection, rows }" as-child :target="{ kind: 'all-matching' }" :aria-label="copy.selectAll">
                  <DocsCheckbox :model-value="bulkSelectionValue(rowSelection, rows)" />
                </DataTable.BulkSelectionControl>
              </th>
              <DataTable.ColumnHeader v-for="(column, index) in columns" :key="column.id" :headerNodeID="column.id">
                <DataTable.SortTrigger :column="column.id">
                  {{ copy.columns[index] }}
                  <ArrowUp v-if="direction(column.id) === 'ascending'" :size="14" aria-hidden="true" />
                  <ArrowDown v-else-if="direction(column.id) === 'descending'" :size="14" aria-hidden="true" />
                  <ChevronsUpDown v-else :size="14" aria-hidden="true" />
                </DataTable.SortTrigger>
              </DataTable.ColumnHeader>
            </DataTable.HeaderRow>
          </DataTable.Header>
          <DataTable.Body>
            <template #default="{ row }">
              <td class="tabular-table__select">
                <DataTable.SelectionControl v-slot="{ rowSelection }" as-child name="selected-users" :aria-label="copy.selectRow(row.cells.name)">
                  <DocsCheckbox :model-value="rowSelectionValue(rowSelection, row.id)" />
                </DataTable.SelectionControl>
              </td>
              <DataTable.Cell column="name"><strong>{{ row.cells.name }}</strong></DataTable.Cell>
              <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
              <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
              <DataTable.Cell column="lastActive">{{ row.cells.lastActive }}</DataTable.Cell>
              <DataTable.Cell column="status"><span class="tabular-demo__status" :data-tone="row.cells.status">{{ copy.status[row.cells.status] }}</span></DataTable.Cell>
            </template>
            <template #empty><tr><td colspan="6" class="tabular-demo__empty">{{ source.status.value === 'loading' ? copy.loading : copy.empty }}</td></tr></template>
          </DataTable.Body>
        </DataTable.Root>
      </div>
      <footer class="tabular-demo__footer"><span>{{ copy.hint }}</span><strong>{{ copy.count(rows.length) }} · {{ copy.selected(selectedCount) }}</strong></footer>
    </section>
  </DataTable.Provider>
</template>
