<script setup lang="ts">
import { computed, useId } from 'vue';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff, Pin, Table2 } from '@lucide/vue';
import { TextField } from '@sectile/vue/text';
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
import DocsButton from './DocsButton.vue';
import DocsDemoFooter from './DocsDemoFooter.vue';
import DocsDemoHeader from './DocsDemoHeader.vue';
import DocsSearchField from './DocsSearchField.vue';
import DocsStatusBadge from './DocsStatusBadge.vue';
import '../tabular-docs.css';

const props = withDefaults(defineProps<{
  focus?: 'overview' | 'query' | 'selection' | 'structure' | 'columns';
}>(), { focus: 'overview' });
const titleID = `tabular-data-table-demo-${useId()}`;

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '사용자 목록', subtitle: '소속, 역할과 계정 상태를 한눈에 확인', search: '이름, 소속 또는 역할 검색', selectAll: '검색 결과 전체 선택',
  columns: ['이름', '소속', '역할', '최근 활동', '상태'], status: { active: '사용 중', invited: '초대됨', suspended: '중지됨' },
  hint: '열 제목을 눌러 정렬 · Shift로 행 범위 선택 · 검색 결과 전체 선택', loading: '불러오는 중…', empty: '검색 결과가 없습니다',
  identity: '사용자 정보', activity: '계정 활동', hideRole: '역할 열 숨기기', showRole: '역할 열 표시', pinName: '이름 열 고정', unpinName: '이름 열 고정 해제',
  count: (value: number) => `${value}명 표시`, selected: (value: number) => `${value}명 선택`, selectRow: (name: string) => `${name} 선택`,
} : {
  title: 'Users', subtitle: 'Compare teams, roles, and account status', search: 'Search name, team, or role', selectAll: 'Select all matching results',
  columns: ['Name', 'Team', 'Role', 'Last active', 'Status'], status: { active: 'Active', invited: 'Invited', suspended: 'Suspended' },
  hint: 'Select a column heading to sort · Shift-select a row range · Select all matching', loading: 'Loading…', empty: 'No matching users',
  identity: 'User information', activity: 'Account activity', hideRole: 'Hide role column', showRole: 'Show role column', pinName: 'Pin name column', unpinName: 'Unpin name column',
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
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter', 'edit'], headerNodeID: 'name-header' },
  { id: 'team', label: 'Team', capabilities: ['sort', 'filter'], headerNodeID: 'team-header' },
  { id: 'role', label: 'Role', capabilities: ['sort', 'filter'], headerNodeID: 'role-header' },
  { id: 'lastActive', label: 'Last active', capabilities: ['sort', 'filter'], headerNodeID: 'last-active-header' },
  { id: 'status', label: 'Status', capabilities: ['sort', 'filter'], headerNodeID: 'status-header' },
]);
const headers = [
  { kind: 'group' as const, id: 'identity', children: [
    { kind: 'column' as const, id: 'name-header', columnID: 'name' },
    { kind: 'column' as const, id: 'team-header', columnID: 'team' },
    { kind: 'column' as const, id: 'role-header', columnID: 'role' },
  ] },
  { kind: 'group' as const, id: 'activity', children: [
    { kind: 'column' as const, id: 'last-active-header', columnID: 'lastActive' },
    { kind: 'column' as const, id: 'status-header', columnID: 'status' },
  ] },
];
let viewRevision = 0;

const table = useDataTable<UserCells>({ columns, headers });
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
    rows, columnSchema: { revision: request.columnSchemaRevision, columns, headers }, removedRowIDs: [],
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
const columnState = computed(() => table.snapshot.value.state.columnState);
const visibleColumns = computed(() => columns.filter((column) => !columnState.value.hidden.includes(column.id)));
const roleHidden = computed(() => columnState.value.hidden.includes('role'));
const namePinned = computed(() => columnState.value.pinnedStart.includes('name'));
const focusState = computed(() => {
  const snapshot = table.snapshot.value.state;
  if (props.focus === 'query') return JSON.stringify({ sort: snapshot.query.sort, filters: snapshot.query.filters });
  if (props.focus === 'selection') return JSON.stringify(snapshot.rowSelection);
  if (props.focus === 'structure') return isKorean.value ? '2단계 header · native input commit intent' : 'Two header levels · native input commit intent';
  if (props.focus === 'columns') return JSON.stringify({ hidden: snapshot.columnState.hidden, pinnedStart: snapshot.columnState.pinnedStart });
  return isKorean.value ? '검색 · 정렬 · 선택이 하나의 projection을 공유합니다.' : 'Search, sorting, and selection share one projection.';
});
const focusLabel = computed(() => ({
  overview: isKorean.value ? '요약' : 'Overview',
  query: isKorean.value ? '조회 상태' : 'Query state',
  selection: isKorean.value ? '선택 상태' : 'Selection state',
  structure: isKorean.value ? '표 구조' : 'Structure',
  columns: isKorean.value ? '열 상태' : 'Column state',
})[props.focus]);

function updateColumnState(values: { readonly hidden?: readonly string[]; readonly pinnedStart?: readonly string[] }): void {
  table.dispatch({ type: 'set-column-state', columnState: { ...columnState.value, ...values } });
}

function toggleRole(): void {
  updateColumnState({ hidden: roleHidden.value ? columnState.value.hidden.filter((id) => id !== 'role') : [...columnState.value.hidden, 'role'] });
}

function toggleNamePin(): void {
  updateColumnState({ pinnedStart: namePinned.value ? columnState.value.pinnedStart.filter((id) => id !== 'name') : ['name', ...columnState.value.pinnedStart] });
}
const direction = (columnID: string) => {
  const snapshot = table.getSnapshot();
  return snapshot.state.query.sort.find((item) => item.columnID === columnID)?.direction;
};
const statusIntent = (status: UserCells['status']) => status === 'active' ? 'success' : status === 'suspended' ? 'critical' : 'warning';
</script>

<template>
  <DataTable.Provider>
    <section class="tabular-demo tabular-demo--table" :aria-label="copy.title">
      <DocsDemoHeader
        :title-id="titleID"
        :title="copy.title"
        :subtitle="copy.subtitle"
        :meta="copy.count(records.length)"
      >
        <template #icon><Table2 :size="18" aria-hidden="true" /></template>
        <template #action>
          <div v-if="focus === 'columns'" class="tabular-demo__column-actions">
            <DocsButton compact @click="toggleRole"><EyeOff :size="14" aria-hidden="true" />{{ roleHidden ? copy.showRole : copy.hideRole }}</DocsButton>
            <DocsButton compact appearance="ghost" @click="toggleNamePin"><Pin :size="14" aria-hidden="true" />{{ namePinned ? copy.unpinName : copy.pinName }}</DocsButton>
          </div>
          <DocsSearchField v-else class="tabular-demo__search" :label="copy.search" compact>
            <DataTable.FilterControl as-child scope="global" id="user-search" predicate="contains">
              <TextField type="search" :placeholder="copy.search" />
            </DataTable.FilterControl>
          </DocsSearchField>
        </template>
      </DocsDemoHeader>

      <div class="tabular-demo__witness" aria-live="polite"><span>{{ focusLabel }}</span><code>{{ focusState }}</code></div>

      <div class="tabular-demo__viewport">
        <DataTable.Root class="tabular-table" :aria-labelledby="titleID">
          <DataTable.Header>
            <DataTable.HeaderRow>
              <th class="tabular-table__select" rowspan="2">
                <DataTable.BulkSelectionControl v-slot="{ rowSelection, rows }" as-child :target="{ kind: 'all-matching' }" :aria-label="copy.selectAll">
                  <DocsCheckbox :model-value="bulkSelectionValue(rowSelection, rows)" />
                </DataTable.BulkSelectionControl>
              </th>
              <DataTable.ColumnHeader header="identity">{{ copy.identity }}</DataTable.ColumnHeader>
              <DataTable.ColumnHeader header="activity">{{ copy.activity }}</DataTable.ColumnHeader>
            </DataTable.HeaderRow>
            <DataTable.HeaderRow>
              <DataTable.ColumnHeader
                v-for="column in visibleColumns"
                :key="column.id"
                :column="column.id"
                :class="{ 'tabular-table__pinned': namePinned && column.id === 'name' }"
              >
                <DataTable.SortTrigger :column="column.id">
                  {{ copy.columns[columns.findIndex(item => item.id === column.id)] }}
                  <ArrowUp v-if="direction(column.id) === 'ascending'" :size="14" aria-hidden="true" />
                  <ArrowDown v-else-if="direction(column.id) === 'descending'" :size="14" aria-hidden="true" />
                  <ChevronsUpDown v-else :size="14" aria-hidden="true" />
                </DataTable.SortTrigger>
                <DataTable.ColumnResizeHandle
                  v-if="focus === 'columns'"
                  :column="column.id"
                  :min-size="110"
                  :max-size="360"
                  :aria-label="`${copy.columns[columns.findIndex(item => item.id === column.id)]} resize`"
                />
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
              <DataTable.Cell
                v-for="column in visibleColumns"
                :key="column.id"
                :column="column.id"
                :class="{ 'tabular-table__pinned': namePinned && column.id === 'name' }"
              >
                <template v-if="column.id === 'name' && focus === 'structure'">
                  <DataTable.Editor as-child column="name"><input class="tabular-table__editor" :value="row.cells.name" :aria-label="`${row.cells.name} edit`"></DataTable.Editor>
                </template>
                <strong v-else-if="column.id === 'name'">{{ row.cells.name }}</strong>
                <DocsStatusBadge v-else-if="column.id === 'status'" :intent="statusIntent(row.cells.status)">{{ copy.status[row.cells.status] }}</DocsStatusBadge>
                <template v-else>{{ row.cells[column.id] }}</template>
              </DataTable.Cell>
            </template>
            <template #empty><tr><td :colspan="visibleColumns.length + 1" class="tabular-demo__empty">{{ source.status.value === 'loading' ? copy.loading : copy.empty }}</td></tr></template>
          </DataTable.Body>
        </DataTable.Root>
      </div>
      <DocsDemoFooter>
        {{ copy.hint }}
        <template #summary>{{ copy.count(rows.length) }} · {{ copy.selected(selectedCount) }}</template>
      </DocsDemoFooter>
    </section>
  </DataTable.Provider>
</template>
