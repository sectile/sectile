<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue';
import type { ComponentPublicInstance } from 'vue';
import { ArrowDownToLine, ArrowUpToLine, RotateCcw, Trash2 } from '@lucide/vue';
import { SliderRange, SliderRoot, SliderThumb, SliderTrack } from '@sectile/vue/slider';
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group';
import { ToolbarItem, ToolbarRoot } from '@sectile/vue/toolbar';
import { linearLayoutStrategy, type LinearLayoutState, type LinearMeasurement, type LinearPatch } from '@sectile/virtual/linear-layout';
import type { VirtualPoint } from '@sectile/virtual/layout';
import { createAxisMeasurementResolver, useVirtualizer, virtualContentStyle, virtualItemStyle } from '@sectile/vue/virtual';
import { useDocsLocale } from '../locale.js';
import { createExampleLayout, insertBeforeViewport } from '../../../examples/virtual/linear-window.js';
import VirtualWorkItemRow from './VirtualWorkItemRow.vue';

const itemCount = 50_000;
const fallback = 132;
const overscanValue = ref('480');
const densityValue = ref<readonly string[]>(['comfortable']);
const root = shallowRef<HTMLElement | null>(null);
const state = shallowRef<LinearLayoutState>(createExampleLayout(itemCount, fallback));
const correction = ref(0);
const mutationLabel = ref('');
const insertedCount = ref(0);
const selected = ref<ReadonlySet<string>>(new Set());
const expanded = ref<ReadonlySet<string>>(new Set());
const { isKorean } = useDocsLocale();
const registrations = new Map<string, { element: HTMLElement; unregister: () => void }>();

const overscan = computed(() => Number(overscanValue.value));
const density = computed<'compact' | 'comfortable'>(() => densityValue.value[0] === 'compact' ? 'compact' : 'comfortable');
const virtualizer = useVirtualizer<LinearLayoutState, string, LinearMeasurement, LinearPatch>({
  state,
  root,
  strategy: linearLayoutStrategy,
  overscan,
  measure: createAxisMeasurementResolver('vertical'),
  writeScroll(element, point: VirtualPoint) {
    correction.value = Math.round(point.y - element.scrollTop);
    element.scrollTo({ left: point.x, top: point.y });
  },
});
const plan = computed(() => virtualizer.plan.value);
const placements = computed(() => plan.value?.placements ?? []);
const visibleCount = computed(() => placements.value.filter(({ visible }) => visible).length);
const selectedIds = computed(() => [...selected.value].sort((left, right) => (state.value.domain.indexOf(left) ?? 0) - (state.value.domain.indexOf(right) ?? 0)));
const toolbarItems = ['insert', 'remove', 'move', 'reset'] as const;
const densityItems = ['compact', 'comfortable'] as const;

const copy = computed(() => isKorean.value ? {
  aria: '고객 문의 기록 가상화 체험', title: '고객 문의 기록', count: '완료된 문의를 포함한 기록 50,000건',
  description: '각 행은 선택 상자, 상태, 태그, 요약, 처리 내역을 가진 실제 컴포넌트입니다. 화면 주변의 행만 DOM에 두고, 처리 내역을 펼치거나 접을 때 바뀐 높이를 바로 측정합니다.',
  density: '한 행에 표시할 정보', compact: '요약', comfortable: '전체', overscan: '화면 밖 준비 범위',
  overscanHelp: '빠르게 스크롤할 때 빈 곳이 보이지 않도록 화면 위아래에 미리 준비할 거리입니다.',
  changes: '목록 변경 시험', insert: '맨 위에 기록 추가', remove: '선택 기록 삭제', move: '선택 기록 맨 위로', reset: '예시 초기화',
  rendered: 'DOM에 있는 행', visible: '현재 보이는 행', total: '전체 기록', correction: '스크롤 조정값',
  stage: '행의 처리 내역을 펼치거나 접어 높이 변화를 확인해 보세요.',
  hint: '행을 선택한 뒤 삭제하거나 맨 위로 옮길 수 있습니다. 목록을 내린 상태에서 앞쪽 기록이 바뀌어도 읽던 행은 같은 위치에 남습니다.',
  inserted: '새 기록을 맨 위에 추가했습니다', removed: '선택한 기록을 삭제했습니다', moved: '선택한 기록을 맨 위로 옮겼습니다',
} : {
  aria: 'Customer request archive virtualization demo', title: 'Customer request archive', count: '50,000 records including completed requests',
  description: 'Each row is a complete component with selection, status, tags, summary, and activity. Only rows around the viewport enter the DOM, and expanding or collapsing activity measures the new height immediately.',
  density: 'Information per row', compact: 'Summary', comfortable: 'Full', overscan: 'Offscreen buffer',
  overscanHelp: 'Extra space prepared above and below the viewport to avoid blank areas during fast scrolling.',
  changes: 'Test collection changes', insert: 'Add record at top', remove: 'Delete selected', move: 'Move selected to top', reset: 'Reset example',
  rendered: 'Rows in DOM', visible: 'Visible rows', total: 'Total records', correction: 'Scroll adjustment',
  stage: 'Expand or collapse activity to change a row height.',
  hint: 'Select rows, then delete or move them to the top. Changing records before the viewport keeps the row being read in place.',
  inserted: 'Added a record at the top', removed: 'Deleted the selected records', moved: 'Moved the selected records to the top',
});

watch(density, () => {
  requestAnimationFrame(() => virtualizer.refresh());
});

onBeforeUnmount(() => {
  for (const registration of registrations.values()) registration.unregister();
  registrations.clear();
});

function itemElement(id: string, value: Element | ComponentPublicInstance | null) {
  let element: HTMLElement | null = null;
  if (value instanceof HTMLElement) element = value;
  else if (value !== null && '$el' in value && value.$el instanceof HTMLElement) element = value.$el;
  const current = registrations.get(id);
  if (current?.element === element) return;
  current?.unregister();
  registrations.delete(id);
  if (element !== null) registrations.set(id, { element, unregister: virtualizer.registerItem(element, id) });
}

function applyMutation(mutation: LinearPatch, label = '') {
  const result = virtualizer.mutate(mutation);
  if (!result.ok) return;
  correction.value = Math.round(result.value.scrollDelta.y);
  if (label !== '') mutationLabel.value = label;
}

function invoke(action: string) {
  if (action === 'insert') {
    insertedCount.value += 1;
    applyMutation(insertBeforeViewport(`request-new-${insertedCount.value}`, fallback), copy.value.inserted);
  } else if (action === 'remove' && selectedIds.value.length > 0) {
    for (const id of [...selectedIds.value].reverse()) {
      const index = state.value.domain.indexOf(id);
      if (index !== null) applyMutation({ patch: { type: 'splice', index, deleteCount: 1, inserted: [] } });
    }
    selected.value = new Set();
    mutationLabel.value = copy.value.removed;
  } else if (action === 'move' && selectedIds.value.length > 0) {
    selectedIds.value.forEach((id, target) => {
      const from = state.value.domain.indexOf(id);
      if (from !== null && from !== target) applyMutation({ patch: { type: 'move', from, to: target, count: 1 } });
    });
    mutationLabel.value = copy.value.moved;
  } else if (action === 'reset') reset();
}

function toggleSelected(id: string, value: boolean) {
  const next = new Set(selected.value);
  if (value) next.add(id); else next.delete(id);
  selected.value = next;
}

function toggleExpanded(id: string, value: boolean) {
  const next = new Set(expanded.value);
  if (value) next.add(id); else next.delete(id);
  expanded.value = next;
}

function reset() {
  state.value = createExampleLayout(itemCount, fallback);
  insertedCount.value = 0;
  correction.value = 0;
  mutationLabel.value = '';
  selected.value = new Set();
  expanded.value = new Set();
  root.value?.scrollTo({ left: 0, top: 0 });
}
</script>

<template>
  <section class="product-virtual ds-product" :aria-label="copy.aria">
    <header class="product-virtual__heading">
      <div>
        <h3>{{ copy.title }}</h3>
        <strong class="product-virtual__count">{{ copy.count }}</strong>
        <p>{{ copy.description }}</p>
      </div>
    </header>

    <div class="product-virtual__controls">
      <div class="ds-field">
        <span>{{ copy.density }}</span>
        <ToggleGroupRoot v-model="densityValue" :items="densityItems" :deselectable="false" class="ds-segmented" :label="copy.density">
          <ToggleGroupItem value="compact">{{ copy.compact }}</ToggleGroupItem>
          <ToggleGroupItem value="comfortable">{{ copy.comfortable }}</ToggleGroupItem>
        </ToggleGroupRoot>
      </div>

      <div class="ds-field ds-field--slider">
        <span>{{ copy.overscan }} <output>{{ overscan }}px</output></span>
        <SliderRoot v-model="overscanValue" min="0" max="960" step="80" :label="copy.overscan" class="ds-slider">
          <SliderTrack class="ds-slider__track"><SliderRange class="ds-slider__range" /><SliderThumb class="ds-slider__thumb" /></SliderTrack>
        </SliderRoot>
        <small>{{ copy.overscanHelp }}</small>
      </div>

      <div class="ds-field product-virtual__change-field">
        <span>{{ copy.changes }}</span>
        <ToolbarRoot :items="toolbarItems" class="ds-toolbar" :label="copy.changes" @invoke="invoke">
          <ToolbarItem value="insert"><ArrowDownToLine :size="15" aria-hidden="true" />{{ copy.insert }}</ToolbarItem>
          <ToolbarItem value="remove" :disabled="selectedIds.length === 0"><Trash2 :size="15" aria-hidden="true" />{{ copy.remove }}</ToolbarItem>
          <ToolbarItem value="move" :disabled="selectedIds.length === 0"><ArrowUpToLine :size="15" aria-hidden="true" />{{ copy.move }}</ToolbarItem>
          <ToolbarItem value="reset"><RotateCcw :size="15" aria-hidden="true" />{{ copy.reset }}</ToolbarItem>
        </ToolbarRoot>
      </div>
    </div>

    <div class="product-virtual__stats" aria-live="polite">
      <span><strong>{{ state.domain.size.toLocaleString() }}</strong>{{ copy.total }}</span>
      <span><strong>{{ placements.length }}</strong>{{ copy.rendered }}</span>
      <span><strong>{{ visibleCount }}</strong>{{ copy.visible }}</span>
      <span><strong>{{ correction > 0 ? `+${correction}` : correction }}px</strong>{{ copy.correction }}</span>
    </div>

    <div class="product-virtual__stage">
      <div class="product-virtual__stage-bar">
        <span>{{ copy.stage }}</span>
        <strong v-if="mutationLabel">{{ mutationLabel }}</strong>
      </div>
      <div ref="root" class="product-virtual__viewport">
        <div class="product-virtual__content" :style="plan === null ? undefined : virtualContentStyle(plan)">
          <VirtualWorkItemRow
            v-for="placement in placements"
            :key="placement.id"
            :ref="value => itemElement(placement.id, value)"
            :id="placement.id"
            :visible="placement.visible"
            :selected="selected.has(placement.id)"
            :expanded="expanded.has(placement.id)"
            :density="density"
            :style="virtualItemStyle(placement, { width: true })"
            @select="toggleSelected(placement.id, $event)"
            @expand="toggleExpanded(placement.id, $event)"
          />
        </div>
      </div>
    </div>
    <p class="product-virtual__hint">{{ copy.hint }}</p>
  </section>
</template>
