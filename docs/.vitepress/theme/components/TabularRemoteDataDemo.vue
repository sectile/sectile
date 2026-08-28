<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ArrowDown, ArrowUp, ChevronsUpDown, Cloud, RefreshCw, Server } from '@lucide/vue';
import { TextField } from '@sectile/vue/text';
import {
  createDataTableComponents,
  defineDataTableColumns,
  useDataTable,
  useDataTableSource,
  type DataTableSourceResolver,
  type DataTableViewResponse,
} from '@sectile/vue/tabular';
import { useDocsLocale } from '../locale.js';
import { bulkSelectionValue, rowSelectionValue } from '../tabular-selection.js';
import DocsButton from './DocsButton.vue';
import DocsCheckbox from './DocsCheckbox.vue';
import DocsDemoFooter from './DocsDemoFooter.vue';
import DocsDemoHeader from './DocsDemoHeader.vue';
import DocsSearchField from './DocsSearchField.vue';
import DocsStatusBadge from './DocsStatusBadge.vue';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  title: '서버 사용자 검색',
  subtitle: '정렬·필터·페이지를 요청으로 보내고 최신 응답만 반영',
  search: '이름, 팀 또는 역할 검색',
  columns: ['이름', '팀', '역할', '근무지', '상태'],
  status: { active: '사용 중', invited: '초대됨', suspended: '중지됨' },
  selectAll: '현재 검색 결과 전체 선택',
  request: '서버 요청',
  loading: '서버에서 새 결과를 불러오는 중',
  success: '최신 응답 반영됨',
  error: '요청에 실패했습니다. 기존 결과는 그대로 유지됩니다.',
  retry: '다시 요청',
  fail: '실패 상태 보기',
  previous: '이전',
  next: '다음',
  empty: '조건에 맞는 사용자가 없습니다.',
  page: (page: number, count: number) => `${page} / ${count} 페이지`,
  results: (count: number) => `총 ${count}명`,
  selected: (count: number) => `${count}명 선택`,
  selectRow: (name: string) => `${name} 선택`,
} : {
  title: 'Server-backed user search',
  subtitle: 'Send sort, filter, and page state; accept only the latest response',
  search: 'Search name, team, or role',
  columns: ['Name', 'Team', 'Role', 'Location', 'Status'],
  status: { active: 'Active', invited: 'Invited', suspended: 'Suspended' },
  selectAll: 'Select every matching result',
  request: 'Server request',
  loading: 'Loading a fresh result from the server',
  success: 'Latest response accepted',
  error: 'The request failed. The previous result remains available.',
  retry: 'Retry request',
  fail: 'Preview failure',
  previous: 'Previous',
  next: 'Next',
  empty: 'No users match these conditions.',
  page: (page: number, count: number) => `Page ${page} of ${count}`,
  results: (count: number) => `${count} total`,
  selected: (count: number) => `${count} selected`,
  selectRow: (name: string) => `Select ${name}`,
});

interface UserCells {
  readonly name: string;
  readonly team: string;
  readonly role: string;
  readonly location: string;
  readonly status: 'active' | 'invited' | 'suspended';
}

interface UserRecord extends UserCells {
  readonly id: string;
}

const columns = defineDataTableColumns([
  { id: 'name', label: 'Name', capabilities: ['sort', 'filter'] },
  { id: 'team', label: 'Team', capabilities: ['sort', 'filter'] },
  { id: 'role', label: 'Role', capabilities: ['sort', 'filter'] },
  { id: 'location', label: 'Location', capabilities: ['sort', 'filter'] },
  { id: 'status', label: 'Status', capabilities: ['sort', 'filter'] },
]);

const names = {
  ko: ['김민서', '박준호', '이서윤', '정하린', '최도윤', '한지우', '윤서준', '강유나', '오하람', '송예린', '임도현', '조수아', '백지훈', '문채원', '남현우', '신가은', '유태민', '권서아'],
  en: ['Maya Chen', 'Elias Novak', 'Amina Yusuf', 'Leo Martins', 'Priya Shah', 'Noah Kim', 'Sofia Rossi', 'Omar Haddad', 'Iris Walker', 'Jules Martin', 'Chen Wei', 'Sam Rivera', 'Noor Aziz', 'Grace Bell', 'Alex Morgan', 'Mina Park', 'Radia Cole', 'Theo Evans'],
};

const records = computed<readonly UserRecord[]>(() => {
  const korean = isKorean.value;
  const team = korean
    ? ['제품 플랫폼', '컴파일러', '신뢰성', '데이터', '인프라', '리서치']
    : ['Product platform', 'Compiler', 'Reliability', 'Data', 'Infrastructure', 'Research'];
  const role = korean
    ? ['스태프 엔지니어', '테크 리드', '수석 엔지니어', '분석 엔지니어', '제품 엔지니어', '엔지니어링 리드']
    : ['Staff engineer', 'Tech lead', 'Principal engineer', 'Analytics engineer', 'Product engineer', 'Engineering lead'];
  const location = korean
    ? ['서울', '도쿄', '싱가포르', '런던', '뉴욕', '원격']
    : ['Seoul', 'Tokyo', 'Singapore', 'London', 'New York', 'Remote'];
  return names[korean ? 'ko' : 'en'].map((name, index) => ({
    id: `user-${index + 1}`,
    name,
    team: team[index % team.length]!,
    role: role[(index * 5) % role.length]!,
    location: location[(index * 7) % location.length]!,
    status: index % 9 === 4 ? 'invited' : index % 11 === 7 ? 'suspended' : 'active',
  }));
});

const table = useDataTable<UserCells>({
  columns,
  defaultAccessState: {
    kind: 'page',
    page: 1,
    itemsPerPage: 5,
    visibleRowCount: null,
    pagination: null,
  },
});
const DataTable = createDataTableComponents(table);
const lastRequest = ref('GET /api/users?page=1&pageSize=5');
let failNextRequest = false;
let viewRevision = 0;

type Request = Parameters<DataTableSourceResolver<UserCells>>[0];

function requestParams(request: Request): URLSearchParams {
  const params = new URLSearchParams();
  if (request.access.kind === 'page') {
    params.set('page', String(request.access.page));
    params.set('pageSize', String(request.access.itemsPerPage));
  } else {
    params.set('offset', String(request.access.start));
    params.set('limit', String(request.access.count));
  }
  for (const filter of request.query.filters) {
    if (filter.enabled !== false && typeof filter.value === 'string' && filter.value !== '') params.append('filter', `${filter.id}:${filter.value}`);
  }
  for (const sort of request.query.sort) params.append('sort', `${sort.columnID}:${sort.direction === 'ascending' ? 'asc' : 'desc'}`);
  return params;
}

async function mockFetchUsers(params: URLSearchParams, signal: AbortSignal): Promise<{ readonly rows: readonly UserRecord[]; readonly total: number }> {
  const shouldFail = failNextRequest;
  failNextRequest = false;
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(resolve, 480);
    signal.addEventListener('abort', () => {
      window.clearTimeout(timer);
      reject(new DOMException('Request aborted', 'AbortError'));
    }, { once: true });
  });
  if (shouldFail) throw new Error('503 Service Unavailable');
  const filters = params.getAll('filter').map((value) => value.slice(value.indexOf(':') + 1).trim().toLocaleLowerCase()).filter(Boolean);
  let result = records.value.filter((record) => filters.every((filter) => `${record.name} ${record.team} ${record.role} ${record.location} ${record.status}`.toLocaleLowerCase().includes(filter)));
  const sorts = params.getAll('sort');
  if (sorts.length > 0) {
    result = [...result].sort((left, right) => {
      for (const encoded of sorts) {
        const [columnID, direction] = encoded.split(':') as [keyof UserCells, 'asc' | 'desc'];
        const order = String(left[columnID]).localeCompare(String(right[columnID]));
        if (order !== 0) return direction === 'asc' ? order : -order;
      }
      return left.id.localeCompare(right.id);
    });
  }
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Math.max(1, Number(params.get('pageSize') ?? 5));
  return { rows: result.slice((page - 1) * pageSize, page * pageSize), total: result.length };
}

function toViewResponse(request: Request, result: { readonly rows: readonly UserRecord[]; readonly total: number }): DataTableViewResponse<UserCells> {
  return {
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: ++viewRevision,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: result.total },
    visibleRowCount: { kind: 'known', value: result.total },
    rows: result.rows.map((record) => ({
      kind: 'leaf',
      id: record.id,
      cells: {
        name: record.name,
        team: record.team,
        role: record.role,
        location: record.location,
        status: record.status,
      },
    })),
    columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
    removedRowIDs: [],
  };
}

const source = useDataTableSource(table, async (request, { signal }) => {
  const params = requestParams(request);
  lastRequest.value = `GET /api/users?${params}`;
  return toViewResponse(request, await mockFetchUsers(params, signal));
});

watch(isKorean, () => source.reload());

const rows = computed(() => {
  const accepted = table.acceptedViewState.value;
  return accepted.kind === 'none' ? [] : accepted.view.rows.filter((row) => row.kind === 'leaf');
});
const access = computed(() => {
  void table.snapshot.value;
  return table.getSnapshot().state.accessState;
});
const pageCount = computed(() => access.value.kind === 'page' ? Math.max(1, Math.ceil((access.value.visibleRowCount ?? 0) / access.value.itemsPerPage)) : 1);
const total = computed(() => access.value.kind === 'page' ? access.value.visibleRowCount ?? 0 : rows.value.length);
const selectedCount = computed(() => {
  void table.snapshot.value;
  const selection = table.getProjection().rowSelection;
  return selection.kind === 'explicit-rows' ? selection.rowIDs.length : Math.max(0, total.value - selection.excludedRowIDs.length);
});
const direction = (columnID: string) => table.getSnapshot().state.query.sort.find((item) => item.columnID === columnID)?.direction;
const statusIntent = (status: UserCells['status']) => status === 'active' ? 'success' : status === 'suspended' ? 'critical' : 'warning';

function goToPage(page: number): void {
  if (access.value.kind !== 'page' || page < 1 || page > pageCount.value || page === access.value.page) return;
  table.dispatch({ type: 'set-access', accessState: { ...access.value, page, pagination: { page, itemsPerPage: access.value.itemsPerPage } } });
}

function previewFailure(): void {
  failNextRequest = true;
  source.reload();
}
</script>

<template>
  <DataTable.Provider>
    <section class="tabular-demo tabular-remote" :aria-label="copy.title">
      <DocsDemoHeader
        title-id="tabular-remote-demo-title"
        :title="copy.title"
        :subtitle="copy.subtitle"
        :meta="copy.results(total)"
      >
        <template #icon><Cloud :size="18" aria-hidden="true" /></template>
        <template #action>
          <DocsSearchField class="tabular-demo__search" :label="copy.search" compact>
            <DataTable.FilterControl as-child scope="global" id="user-search" predicate="contains">
              <TextField type="search" :placeholder="copy.search" />
            </DataTable.FilterControl>
          </DocsSearchField>
        </template>
      </DocsDemoHeader>

      <div class="tabular-remote__request" aria-live="polite">
        <span><Server :size="14" aria-hidden="true" />{{ copy.request }}</span>
        <code>{{ lastRequest }}</code>
        <DocsStatusBadge :intent="source.status.value === 'error' ? 'critical' : source.status.value === 'loading' ? 'info' : 'success'">
          {{ source.status.value === 'error' ? copy.error : source.status.value === 'loading' ? copy.loading : copy.success }}
        </DocsStatusBadge>
      </div>

      <div class="tabular-demo__viewport">
        <DataTable.Root class="tabular-table" aria-labelledby="tabular-remote-demo-title">
          <DataTable.Header>
            <DataTable.HeaderRow>
              <th class="tabular-table__select">
                <DataTable.BulkSelectionControl v-slot="{ rowSelection, rows: visibleRows }" as-child :target="{ kind: 'all-matching' }" :aria-label="copy.selectAll">
                  <DocsCheckbox :model-value="bulkSelectionValue(rowSelection, visibleRows)" />
                </DataTable.BulkSelectionControl>
              </th>
              <DataTable.ColumnHeader v-for="(column, index) in columns" :key="column.id" :column="column.id">
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
                <DataTable.SelectionControl v-slot="{ rowSelection }" as-child name="remote-users" :aria-label="copy.selectRow(row.cells.name)">
                  <DocsCheckbox :model-value="rowSelectionValue(rowSelection, row.id)" />
                </DataTable.SelectionControl>
              </td>
              <DataTable.Cell column="name"><strong>{{ row.cells.name }}</strong></DataTable.Cell>
              <DataTable.Cell column="team">{{ row.cells.team }}</DataTable.Cell>
              <DataTable.Cell column="role">{{ row.cells.role }}</DataTable.Cell>
              <DataTable.Cell column="location">{{ row.cells.location }}</DataTable.Cell>
              <DataTable.Cell column="status"><DocsStatusBadge :intent="statusIntent(row.cells.status)">{{ copy.status[row.cells.status] }}</DocsStatusBadge></DataTable.Cell>
            </template>
            <template #empty><tr><td colspan="6" class="tabular-demo__empty">{{ source.status.value === 'loading' ? copy.loading : copy.empty }}</td></tr></template>
          </DataTable.Body>
        </DataTable.Root>
      </div>

      <div v-if="source.status.value === 'error'" class="tabular-remote__error" role="alert">
        <span>{{ copy.error }}</span>
        <DocsButton compact @click="source.reload"><RefreshCw :size="14" aria-hidden="true" />{{ copy.retry }}</DocsButton>
      </div>

      <DocsDemoFooter>
        <div class="tabular-remote__footer-actions">
          <DocsButton compact :disabled="access.kind !== 'page' || access.page <= 1" @click="goToPage(access.kind === 'page' ? access.page - 1 : 1)">{{ copy.previous }}</DocsButton>
          <strong>{{ copy.page(access.kind === 'page' ? access.page : 1, pageCount) }}</strong>
          <DocsButton compact :disabled="access.kind !== 'page' || access.page >= pageCount" @click="goToPage(access.kind === 'page' ? access.page + 1 : 1)">{{ copy.next }}</DocsButton>
          <DocsButton compact appearance="ghost" :disabled="source.status.value === 'loading'" @click="previewFailure">{{ copy.fail }}</DocsButton>
        </div>
        <template #summary>{{ copy.results(total) }} · {{ copy.selected(selectedCount) }}</template>
      </DocsDemoFooter>
    </section>
  </DataTable.Provider>
</template>
