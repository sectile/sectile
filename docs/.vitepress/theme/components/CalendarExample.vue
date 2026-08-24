<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, ref } from 'vue';
import { CalendarCell, CalendarRoot } from '@sectile/vue/calendar';
import {
  calendarRows,
  calendarSelectionLabel,
  calendarTitle,
  isCalendarWeekend,
  isSameCalendarMonth,
  shiftCalendarAnchor,
  type CalendarViewMode,
} from '../calendar-demo-state.js';

const props = defineProps<{ readonly scenario: string }>();
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const anchor = ref('2026-08-24');
const viewMode = ref<CalendarViewMode>(props.scenario === 'week' ? 'week' : 'month');
const selectedDate = ref<string | null>(null);
const rows = computed(() => calendarRows(anchor.value, viewMode.value));
const visibleValue = computed(() => selectedDate.value !== null && rows.value.flat().includes(selectedDate.value)
  ? selectedDate.value
  : null);
const disabledDates = computed(() => props.scenario === 'disabled-weekends'
  ? rows.value.flat().filter(isCalendarWeekend)
  : []);
const title = computed(() => calendarTitle(anchor.value, viewMode.value, 'en-US'));
const selectionLabel = computed(() => calendarSelectionLabel(selectedDate.value, 'en-US'));

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
  <section class="catalog-calendar-shell">
    <header class="catalog-calendar-heading">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ selectionLabel }}</span>
      </div>
      <div class="catalog-calendar-controls">
        <div class="catalog-calendar-view-switch" aria-label="Calendar view">
          <button type="button" :aria-pressed="viewMode === 'week'" @click="setView('week')">Week</button>
          <button type="button" :aria-pressed="viewMode === 'month'" @click="setView('month')">Month</button>
        </div>
        <div class="catalog-calendar-navigation">
          <button type="button" :aria-label="`Previous ${viewMode}`" @click="move(-1)"><ChevronLeft :size="17" aria-hidden="true" /></button>
          <button type="button" :aria-label="`Next ${viewMode}`" @click="move(1)"><ChevronRight :size="17" aria-hidden="true" /></button>
        </div>
      </div>
    </header>
    <div class="catalog-weekdays" aria-hidden="true"><span v-for="day in weekdayLabels" :key="day">{{ day }}</span></div>
    <CalendarRoot
      :rows="rows"
      :model-value="visibleValue"
      :disabled-values="disabledDates"
      :label="title"
      class="catalog-calendar"
      :data-view="viewMode"
      @update:model-value="select"
      @page="move($event.direction)"
    >
      <CalendarCell
        v-for="day in rows.flat()"
        :key="day"
        :value="day"
        :class="{ 'is-outside': viewMode === 'month' && !isSameCalendarMonth(day, anchor) }"
      >{{ Number(day.slice(-2)) }}</CalendarCell>
    </CalendarRoot>
  </section>
</template>
