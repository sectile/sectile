<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { createDataTable } from '@sectile/tabular/data-table';
import type { TabularViewResponse as DataTableViewResponse } from '@sectile/tabular/data-table';
import { Activity, RotateCcw } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';
import DocsButton from './DocsButton.vue';
import '../tabular-docs.css';

const { isKorean } = useDocsLocale();
const copy = computed(() => isKorean.value ? {
  next: '새 view 요청', select: '첫 행 선택', stale: '오래된 응답 보내기', reset: '다시 시작',
  accepted: '현재 view', request: '요청 상태', revision: 'revision', selection: '선택',
  rejected: '오래된 응답을 원자적으로 거부했습니다.', ready: '이벤트를 보내 state 변화를 확인하세요.',
} : {
  next: 'Request a new view', select: 'Select first row', stale: 'Send stale response', reset: 'Reset',
  accepted: 'Accepted view', request: 'Request state', revision: 'Revision', selection: 'Selection',
  rejected: 'The stale response was rejected atomically.', ready: 'Dispatch events and inspect the state change.',
});

const columns = [{ id: 'name', capabilities: ['sort'] as const }, { id: 'status' }] as const;
const revision = ref(0);
const message = ref('');
let table = createController();

function createController() {
  const controller = createDataTable({ columns });
  acceptPending(controller, 1);
  return controller;
}

function acceptPending(controller: ReturnType<typeof createDataTable>, viewRevision: number): void {
  const pending = controller.getSnapshot().state.requestState.pendingRequest;
  if (pending === null) return;
  const response: DataTableViewResponse = {
    ...pending,
    viewRevision,
    matchingLeafCount: { kind: 'known', value: 3 },
    visibleRowCount: { kind: 'known', value: 3 },
    rows: [
      { kind: 'leaf', id: 'alpha', cells: { name: 'Alpha', status: 'ready' } },
      { kind: 'leaf', id: 'beta', cells: { name: 'Beta', status: 'review' } },
      { kind: 'leaf', id: 'gamma', cells: { name: 'Gamma', status: 'ready' } },
    ],
    columnSchema: { revision: pending.columnSchemaRevision, columns, headers: [] },
    removedRowIDs: [],
  };
  controller.synchronizeView(response);
}

function update(action: () => void): void {
  action();
  revision.value += 1;
}

function requestView(): void {
  update(() => {
    table.requestView();
    acceptPending(table, table.getSnapshot().revision + 1);
    message.value = copy.value.ready;
  });
}

function selectFirst(): void {
  update(() => {
    table.dispatch({ type: 'toggle-row-selection', rowID: 'alpha' });
    message.value = copy.value.ready;
  });
}

function sendStale(): void {
  update(() => {
    const snapshot = table.getSnapshot();
    const accepted = snapshot.state.acceptedViewState;
    if (accepted.kind === 'none') return;
    const rejected = table.synchronizeView({
      ...accepted.view,
      protocolVersion: 1,
      requestID: -1,
      viewRevision: accepted.view.viewRevision + 1,
      removedRowIDs: [],
    });
    message.value = rejected.ok ? copy.value.ready : copy.value.rejected;
  });
}

function reset(): void {
  update(() => {
    table.dispose();
    table = createController();
    message.value = copy.value.ready;
  });
}

const state = computed(() => {
  void revision.value;
  const snapshot = table.getSnapshot();
  const accepted = snapshot.state.acceptedViewState;
  return {
    revision: snapshot.revision,
    request: snapshot.state.requestState.kind,
    accepted: accepted.kind,
    viewRevision: accepted.kind === 'none' ? null : accepted.view.viewRevision,
    selection: snapshot.state.rowSelection.kind === 'explicit-rows' ? snapshot.state.rowSelection.rowIDs : 'all matching',
  };
});

message.value = copy.value.ready;
onBeforeUnmount(() => table.dispose());
</script>

<template>
  <section class="tabular-contract-demo" aria-labelledby="tabular-contract-demo-title">
    <header>
      <span class="tabular-contract-demo__icon"><Activity :size="17" aria-hidden="true" /></span>
      <div>
        <strong id="tabular-contract-demo-title">State → event → result</strong>
        <span>{{ message }}</span>
      </div>
    </header>
    <div class="tabular-contract-demo__actions">
      <DocsButton compact @click="requestView">{{ copy.next }}</DocsButton>
      <DocsButton compact @click="selectFirst">{{ copy.select }}</DocsButton>
      <DocsButton compact @click="sendStale">{{ copy.stale }}</DocsButton>
      <DocsButton compact appearance="ghost" @click="reset"><RotateCcw :size="14" aria-hidden="true" />{{ copy.reset }}</DocsButton>
    </div>
    <dl class="tabular-contract-demo__state">
      <div><dt>{{ copy.revision }}</dt><dd>{{ state.revision }}</dd></div>
      <div><dt>{{ copy.request }}</dt><dd>{{ state.request }}</dd></div>
      <div><dt>{{ copy.accepted }}</dt><dd>{{ state.accepted }} · {{ state.viewRevision }}</dd></div>
      <div><dt>{{ copy.selection }}</dt><dd>{{ state.selection }}</dd></div>
    </dl>
  </section>
</template>
