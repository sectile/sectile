<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
  CalendarCell,
  CalendarContent,
  CalendarGrid,
  CalendarNextMonth,
  CalendarNextWeek,
  CalendarPreviousMonth,
  CalendarPreviousWeek,
  CalendarRoot,
  type CalendarPolicies,
  type DateValue,
} from '@sectile/vue/temporal';

const props = defineProps<{ readonly scenario: string }>();
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const initial = Object.freeze({ year: 2026, month: 8, day: 24 });
const viewMode = computed(() => props.scenario === 'week' ? 'week' : 'month');
const selectedDate = ref<DateValue | null>(null);
const policies = computed<CalendarPolicies>(() => props.scenario === 'disabled-weekends'
  ? { unavailable: isWeekend }
  : {});
const selectionLabel = computed(() => selectedDate.value === null
  ? 'No date selected'
  : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
      .format(toDate(selectedDate.value)));

function title(view: { readonly year: number; readonly month: number }): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(view.year, view.month - 1, 1)));
}
function isWeekend(value: DateValue): boolean {
  const day = toDate(value).getUTCDay();
  return day === 0 || day === 6;
}
function toDate(value: DateValue): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}
</script>

<template>
  <CalendarRoot
    :key="viewMode"
    v-model="selectedDate"
    :default-highlighted-value="initial"
    :default-view="viewMode"
    :policies="policies"
    label="Release calendar"
    v-slot="{ dates, view }"
  >
    <CalendarContent class="catalog-calendar-shell catalog-picker-popup">
      <header class="catalog-calendar-heading">
        <div>
          <strong>{{ title(view) }}</strong>
          <span>{{ selectionLabel }}</span>
        </div>
        <div class="catalog-calendar-controls">
          <div class="catalog-calendar-navigation">
            <component
              :is="viewMode === 'week' ? CalendarPreviousWeek : CalendarPreviousMonth"
              :aria-label="`Previous ${viewMode}`"
            ><ChevronLeft :size="17" aria-hidden="true" /></component>
            <component
              :is="viewMode === 'week' ? CalendarNextWeek : CalendarNextMonth"
              :aria-label="`Next ${viewMode}`"
            ><ChevronRight :size="17" aria-hidden="true" /></component>
          </div>
        </div>
      </header>
      <div class="catalog-picker-calendar">
        <div class="catalog-picker-weekdays" aria-hidden="true"><span v-for="day in weekdayLabels" :key="day">{{ day }}</span></div>
        <CalendarGrid class="catalog-calendar" :data-view="viewMode">
          <CalendarCell
            v-for="day in dates.flat()"
            :key="`${day.year}-${day.month}-${day.day}`"
            :value="day"
            :class="{ 'is-outside': viewMode === 'month' && day.month !== view.month }"
          >{{ day.day }}</CalendarCell>
        </CalendarGrid>
      </div>
    </CalendarContent>
  </CalendarRoot>
</template>
