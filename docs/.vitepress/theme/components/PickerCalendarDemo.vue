<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, type Component } from 'vue';
import {
  DatePickerCell, DatePickerGrid, DatePickerMonthCell, DatePickerMonthViewTrigger,
  DatePickerNextMonth, DatePickerNextWeek, DatePickerNextYear, DatePickerPreviousMonth,
  DatePickerPreviousWeek, DatePickerPreviousYear, DatePickerWeekViewTrigger, DatePickerYearViewTrigger,
} from '@sectile/vue/temporal';
import {
  DateRangePickerCell, DateRangePickerGrid, DateRangePickerMonthCell, DateRangePickerMonthViewTrigger,
  DateRangePickerNextMonth, DateRangePickerNextWeek, DateRangePickerNextYear, DateRangePickerPreviousMonth,
  DateRangePickerPreviousWeek, DateRangePickerPreviousYear, DateRangePickerWeekViewTrigger, DateRangePickerYearViewTrigger,
} from '@sectile/vue/temporal';
import {
  DateTimePickerCell, DateTimePickerGrid, DateTimePickerMonthCell, DateTimePickerMonthViewTrigger,
  DateTimePickerNextMonth, DateTimePickerNextWeek, DateTimePickerNextYear, DateTimePickerPreviousMonth,
  DateTimePickerPreviousWeek, DateTimePickerPreviousYear, DateTimePickerWeekViewTrigger, DateTimePickerYearViewTrigger,
  type DateTimePickerRootSlotProps,
} from '@sectile/vue/temporal';
import {
  DateTimeRangePickerCell, DateTimeRangePickerGrid, DateTimeRangePickerMonthCell, DateTimeRangePickerMonthViewTrigger,
  DateTimeRangePickerNextMonth, DateTimeRangePickerNextWeek, DateTimeRangePickerNextYear, DateTimeRangePickerPreviousMonth,
  DateTimeRangePickerPreviousWeek, DateTimeRangePickerPreviousYear, DateTimeRangePickerWeekViewTrigger, DateTimeRangePickerYearViewTrigger,
} from '@sectile/vue/temporal';

type PickerName = 'date-picker' | 'date-range-picker' | 'date-time-picker' | 'date-time-range-picker';
type ViewMode = DateTimePickerRootSlotProps['viewMode'];
interface PickerParts {
  readonly Grid: Component;
  readonly Cell: Component;
  readonly MonthCell: Component;
  readonly Previous: Readonly<Record<ViewMode, Component>>;
  readonly Next: Readonly<Record<ViewMode, Component>>;
  readonly ViewTrigger: Readonly<Record<ViewMode, Component>>;
}

const props = defineProps<{
  readonly component: PickerName;
  readonly dates: DateTimePickerRootSlotProps['dates'];
  readonly months: DateTimePickerRootSlotProps['months'];
  readonly view: DateTimePickerRootSlotProps['view'];
  readonly viewMode: ViewMode;
}>();

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const viewModes: readonly ViewMode[] = ['week', 'month', 'year'];

const catalog: Readonly<Record<PickerName, PickerParts>> = Object.freeze({
  'date-picker': parts(DatePickerGrid, DatePickerCell, DatePickerMonthCell,
    [DatePickerPreviousWeek, DatePickerPreviousMonth, DatePickerPreviousYear],
    [DatePickerNextWeek, DatePickerNextMonth, DatePickerNextYear],
    [DatePickerWeekViewTrigger, DatePickerMonthViewTrigger, DatePickerYearViewTrigger]),
  'date-range-picker': parts(DateRangePickerGrid, DateRangePickerCell, DateRangePickerMonthCell,
    [DateRangePickerPreviousWeek, DateRangePickerPreviousMonth, DateRangePickerPreviousYear],
    [DateRangePickerNextWeek, DateRangePickerNextMonth, DateRangePickerNextYear],
    [DateRangePickerWeekViewTrigger, DateRangePickerMonthViewTrigger, DateRangePickerYearViewTrigger]),
  'date-time-picker': parts(DateTimePickerGrid, DateTimePickerCell, DateTimePickerMonthCell,
    [DateTimePickerPreviousWeek, DateTimePickerPreviousMonth, DateTimePickerPreviousYear],
    [DateTimePickerNextWeek, DateTimePickerNextMonth, DateTimePickerNextYear],
    [DateTimePickerWeekViewTrigger, DateTimePickerMonthViewTrigger, DateTimePickerYearViewTrigger]),
  'date-time-range-picker': parts(DateTimeRangePickerGrid, DateTimeRangePickerCell, DateTimeRangePickerMonthCell,
    [DateTimeRangePickerPreviousWeek, DateTimeRangePickerPreviousMonth, DateTimeRangePickerPreviousYear],
    [DateTimeRangePickerNextWeek, DateTimeRangePickerNextMonth, DateTimeRangePickerNextYear],
    [DateTimeRangePickerWeekViewTrigger, DateTimeRangePickerMonthViewTrigger, DateTimeRangePickerYearViewTrigger]),
});

const picker = computed(() => catalog[props.component]);
const title = computed(() => props.viewMode === 'year'
  ? String(props.view.year)
  : `${monthNames[props.view.month - 1]} ${props.view.year}`);

function viewLabel(mode: ViewMode): string {
  return `${mode.charAt(0).toUpperCase()}${mode.slice(1)}`;
}

function parts(
  Grid: Component,
  Cell: Component,
  MonthCell: Component,
  Previous: readonly [Component, Component, Component],
  Next: readonly [Component, Component, Component],
  ViewTrigger: readonly [Component, Component, Component],
): PickerParts {
  return Object.freeze({
    Grid, Cell, MonthCell,
    Previous: Object.freeze({ week: Previous[0], month: Previous[1], year: Previous[2] }),
    Next: Object.freeze({ week: Next[0], month: Next[1], year: Next[2] }),
    ViewTrigger: Object.freeze({ week: ViewTrigger[0], month: ViewTrigger[1], year: ViewTrigger[2] }),
  });
}
</script>

<template>
  <div class="catalog-picker-toolbar">
    <div class="catalog-picker-navigation">
      <component :is="picker.Previous[viewMode]" :aria-label="`Previous ${viewMode}`"><ChevronLeft :size="17" aria-hidden="true" /></component>
      <strong>{{ title }}</strong>
      <component :is="picker.Next[viewMode]" :aria-label="`Next ${viewMode}`"><ChevronRight :size="17" aria-hidden="true" /></component>
    </div>
    <div class="catalog-view-switch" aria-label="Calendar view">
      <component v-for="mode in viewModes" :is="picker.ViewTrigger[mode]" :key="mode">{{ viewLabel(mode) }}</component>
    </div>
  </div>

  <div v-if="viewMode !== 'year'" class="catalog-picker-calendar">
    <div class="catalog-picker-weekdays" aria-hidden="true"><span v-for="day in weekdayLabels" :key="day">{{ day }}</span></div>
    <component :is="picker.Grid" class="catalog-calendar" :data-view="viewMode">
      <component :is="picker.Cell" v-for="day in dates.flat()" :key="`${day.year}-${day.month}-${day.day}`" :value="day">{{ day.day }}</component>
    </component>
  </div>
  <component :is="picker.Grid" v-else class="catalog-month-grid">
    <component :is="picker.MonthCell" v-for="month in months.flat()" :key="`${month.year}-${month.month}`" :value="month">{{ monthLabels[month.month - 1] }}</component>
  </component>
</template>
