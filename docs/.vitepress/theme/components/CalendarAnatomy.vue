<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, ref } from 'vue';
import { CalendarCell, CalendarRoot } from '@sectile/vue/calendar';
import {
  calendarRows,
  calendarSelectionLabel,
  calendarTitle,
  isSameCalendarMonth,
  shiftCalendarAnchor,
  type CalendarViewMode,
} from '../calendar-demo-state.js';

const props = defineProps<{
  readonly activePart: string;
  readonly korean: boolean;
}>();
const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
}>();

const weekdayLabels = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ko: ['월', '화', '수', '목', '금', '토', '일'],
} as const;
const anchor = ref('2026-08-24');
const viewMode = ref<CalendarViewMode>('month');
const selectedDate = ref<string | null>(null);
const selectedInstance = ref<string | null>(null);
const hoveredInstance = ref<string | null>(null);
const activeInstance = computed(() => hoveredInstance.value ?? selectedInstance.value);
const rows = computed(() => calendarRows(anchor.value, viewMode.value));
const visibleValue = computed(() => selectedDate.value !== null && rows.value.flat().includes(selectedDate.value)
  ? selectedDate.value
  : null);
const locale = computed(() => props.korean ? 'ko-KR' as const : 'en-US' as const);
const title = computed(() => calendarTitle(anchor.value, viewMode.value, locale.value));
const selectionLabel = computed(() => calendarSelectionLabel(selectedDate.value, locale.value));

function partClass(part: string, instance?: string): Record<string, boolean> {
  const active = props.activePart === part && (instance === undefined || activeInstance.value === instance);
  return { 'anatomy-part-active': active };
}

function inspect(event: Event): void {
  const target = eventTarget(event);
  if (target === null) return;
  selectedInstance.value = target.dataset['anatomyInstance'] ?? null;
  emit('select', target.dataset['part'] ?? 'root');
}

function hover(event: Event): void {
  const target = eventTarget(event);
  hoveredInstance.value = target?.dataset['anatomyInstance'] ?? null;
  emit('hover', target?.dataset['part'] ?? null);
}

function eventTarget(event: Event): HTMLElement | null {
  const target = event.target;
  return target instanceof Element ? target.closest<HTMLElement>('[data-part]') : null;
}

function move(direction: -1 | 1): void {
  anchor.value = shiftCalendarAnchor(anchor.value, viewMode.value, direction);
}

function select(value: string | null): void {
  selectedDate.value = value;
  if (value !== null) anchor.value = value;
}

function setView(mode: CalendarViewMode): void {
  if (selectedDate.value !== null) anchor.value = selectedDate.value;
  viewMode.value = mode;
}
</script>

<template>
  <CalendarRoot
    :rows="rows"
    :model-value="visibleValue"
    :label="title"
    data-scope="calendar"
    data-part="root"
    class="calendar-anatomy"
    :class="partClass('root')"
    @update:model-value="select"
    @page="move($event.direction)"
    @click.capture="inspect"
    @pointerover.capture="hover"
    @pointerleave="emit('hover', null)"
  >
    <span v-if="activePart === 'root'" class="calendar-anatomy__part-label anatomy-part-label">root</span>
    <header class="calendar-anatomy__header">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ selectionLabel }}</span>
      </div>
      <div class="calendar-anatomy__controls">
        <div class="calendar-anatomy__view-switch" :aria-label="korean ? '달력 보기' : 'Calendar view'">
          <button type="button" :aria-pressed="viewMode === 'week'" @click="setView('week')">{{ korean ? '주' : 'Week' }}</button>
          <button type="button" :aria-pressed="viewMode === 'month'" @click="setView('month')">{{ korean ? '월' : 'Month' }}</button>
        </div>
        <div class="calendar-anatomy__navigation">
          <button type="button" :aria-label="korean ? `이전 ${viewMode === 'week' ? '주' : '달'}` : `Previous ${viewMode}`" @click="move(-1)"><ChevronLeft :size="18" aria-hidden="true" /></button>
          <button type="button" :aria-label="korean ? `다음 ${viewMode === 'week' ? '주' : '달'}` : `Next ${viewMode}`" @click="move(1)"><ChevronRight :size="18" aria-hidden="true" /></button>
        </div>
      </div>
    </header>
    <div class="calendar-anatomy__weekdays" aria-hidden="true">
      <span v-for="day in (korean ? weekdayLabels.ko : weekdayLabels.en)" :key="day">{{ day }}</span>
    </div>
    <div class="calendar-anatomy__grid" :data-view="viewMode">
      <CalendarCell
        v-for="day in rows.flat()"
        :key="day"
        :value="day"
        :data-anatomy-instance="day"
        class="calendar-anatomy__cell"
        :class="[partClass('cell', day), { 'is-outside': viewMode === 'month' && !isSameCalendarMonth(day, anchor) }]"
      >
        <span v-if="activePart === 'cell' && activeInstance === day" class="calendar-anatomy__part-label anatomy-part-label">cell</span>
        {{ Number(day.slice(-2)) }}
      </CalendarCell>
    </div>
  </CalendarRoot>
</template>

<style>
.calendar-anatomy {
  position: relative;
  width: min(100%, 580px);
  padding: 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
}
.calendar-anatomy, .calendar-anatomy * { box-sizing: border-box; }
.calendar-anatomy button { color: inherit; font: inherit; cursor: pointer; }
.calendar-anatomy__header { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.calendar-anatomy__header > div:first-child { display: grid; gap: 3px; }
.calendar-anatomy__header strong { font-size: 15px; }
.calendar-anatomy__header span { color: var(--vp-c-text-3); font-size: 11px; }
.calendar-anatomy__controls { display: flex; align-items: center; gap: 8px; }
.calendar-anatomy__navigation { display: flex; gap: 6px; }
.calendar-anatomy__navigation button {
  display: inline-grid;
  width: 38px;
  height: 38px;
  padding: 0;
  place-items: center;
  border: 1px solid var(--vp-c-divider);
  border-radius: 9px;
  background: var(--vp-c-bg);
}
.calendar-anatomy__navigation button:hover { background: var(--vp-c-bg-alt); }
.calendar-anatomy__view-switch {
  display: grid;
  height: 38px;
  box-sizing: border-box;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 148px;
  margin: 0;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.calendar-anatomy__view-switch button {
  min-height: 0;
  padding: 0 12px;
  border: 0;
  border-radius: 7px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}
.calendar-anatomy__view-switch button[aria-pressed='true'] { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.calendar-anatomy__weekdays, .calendar-anatomy__grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.calendar-anatomy__weekdays { padding: 4px 0; color: var(--vp-c-text-3); font-size: 11px; font-weight: 700; text-align: center; }
.calendar-anatomy__cell {
  position: relative;
  min-width: 0;
  min-height: 38px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  color: var(--vp-c-text-2);
  background: transparent;
  font-size: 13px;
}
.calendar-anatomy__cell:hover { color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.calendar-anatomy__cell[data-selected] { color: white; background: var(--vp-c-brand-1); }
.calendar-anatomy__cell[data-highlighted]:not([data-selected]) { box-shadow: inset 0 0 0 2px var(--vp-c-brand-1); }
.calendar-anatomy__cell.is-outside { color: var(--vp-c-text-3); }
.calendar-anatomy__grid[data-view='week'] .calendar-anatomy__cell { min-height: 44px; }
.calendar-anatomy__part-label {
  top: -14px;
  left: 10px;
}
.calendar-anatomy :is(button, [role='gridcell']):focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

@media (max-width: 640px) {
  .calendar-anatomy { padding: 14px; }
  .calendar-anatomy__header { align-items: flex-start; flex-wrap: wrap; }
  .calendar-anatomy__controls { width: 100%; justify-content: flex-end; }
  .calendar-anatomy__weekdays, .calendar-anatomy__grid { gap: 2px; }
  .calendar-anatomy__cell { min-height: 34px; }
}
</style>
