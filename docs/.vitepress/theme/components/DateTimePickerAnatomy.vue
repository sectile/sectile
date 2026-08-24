<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, ref, type Component } from 'vue';
import {
  DatePickerCell,
  DatePickerContent,
  DatePickerGrid,
  DatePickerInput,
  DatePickerMonthCell,
  DatePickerMonthViewTrigger,
  DatePickerNextMonth,
  DatePickerNextWeek,
  DatePickerNextYear,
  DatePickerPreviousMonth,
  DatePickerPreviousWeek,
  DatePickerPreviousYear,
  DatePickerRoot,
  DatePickerTrigger,
  DatePickerWeekViewTrigger,
  DatePickerYearViewTrigger,
} from '@sectile/vue/date-picker';
import {
  DateRangePickerCell,
  DateRangePickerContent,
  DateRangePickerEndInput,
  DateRangePickerGrid,
  DateRangePickerMonthCell,
  DateRangePickerMonthViewTrigger,
  DateRangePickerNextMonth,
  DateRangePickerNextWeek,
  DateRangePickerNextYear,
  DateRangePickerPreviousMonth,
  DateRangePickerPreviousWeek,
  DateRangePickerPreviousYear,
  DateRangePickerRoot,
  DateRangePickerStartInput,
  DateRangePickerTrigger,
  DateRangePickerWeekViewTrigger,
  DateRangePickerYearViewTrigger,
} from '@sectile/vue/date-range-picker';
import {
  DateTimePickerCell,
  DateTimePickerContent,
  DateTimePickerDateInput,
  DateTimePickerGrid,
  DateTimePickerMonthCell,
  DateTimePickerMonthViewTrigger,
  DateTimePickerNextMonth,
  DateTimePickerNextWeek,
  DateTimePickerNextYear,
  DateTimePickerPreviousMonth,
  DateTimePickerPreviousWeek,
  DateTimePickerPreviousYear,
  DateTimePickerRoot,
  DateTimePickerTimeInput,
  DateTimePickerTrigger,
  DateTimePickerWeekViewTrigger,
  DateTimePickerYearViewTrigger,
  type DateTimePickerRootSlotProps,
  type DateTimeValue,
  type DateValue,
} from '@sectile/vue/date-time-picker';
import {
  DateTimeRangePickerCell,
  DateTimeRangePickerContent,
  DateTimeRangePickerEndDateTimeInput,
  DateTimeRangePickerGrid,
  DateTimeRangePickerMonthCell,
  DateTimeRangePickerMonthViewTrigger,
  DateTimeRangePickerNextMonth,
  DateTimeRangePickerNextWeek,
  DateTimeRangePickerNextYear,
  DateTimeRangePickerPreviousMonth,
  DateTimeRangePickerPreviousWeek,
  DateTimeRangePickerPreviousYear,
  DateTimeRangePickerRoot,
  DateTimeRangePickerStartDateTimeInput,
  DateTimeRangePickerTrigger,
  DateTimeRangePickerWeekViewTrigger,
  DateTimeRangePickerYearViewTrigger,
} from '@sectile/vue/date-time-range-picker';

type PickerName = 'date-picker' | 'date-range-picker' | 'date-time-picker' | 'date-time-range-picker';
type ViewMode = DateTimePickerRootSlotProps['viewMode'];

interface PickerField {
  readonly component: Component;
  readonly part: string;
  readonly en: string;
  readonly ko: string;
}

interface PickerFieldGroup {
  readonly key: string;
  readonly en: string;
  readonly ko: string;
  readonly fields: readonly PickerField[];
}

interface PickerDefinition {
  readonly Root: Component;
  readonly Trigger: Component;
  readonly Content: Component;
  readonly Grid: Component;
  readonly Cell: Component;
  readonly MonthCell: Component;
  readonly Previous: Readonly<Record<ViewMode, Component>>;
  readonly Next: Readonly<Record<ViewMode, Component>>;
  readonly ViewTrigger: Readonly<Record<ViewMode, Component>>;
  readonly fields: readonly PickerField[];
  readonly defaultValue: object;
}

const props = defineProps<{
  readonly component: PickerName;
  readonly activePart: string;
  readonly korean: boolean;
}>();

const emit = defineEmits<{
  select: [part: string];
  hover: [part: string | null];
}>();

const selectedInstance = ref<string | null>(null);
const hoveredInstance = ref<string | null>(null);
const activeInstance = computed(() => hoveredInstance.value ?? selectedInstance.value);

const initialDate = Object.freeze({ year: 2026, month: 8, day: 22 });
const initialTime = Object.freeze({ hour: 9, minute: 30, second: 0, millisecond: 0 });
const endDate = Object.freeze({ year: 2026, month: 8, day: 29 });
const endTime = Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 });
const initialValue: DateTimeValue = Object.freeze({
  date: initialDate,
  time: initialTime,
});

const pickerCatalog: Readonly<Record<PickerName, PickerDefinition>> = Object.freeze({
  'date-picker': Object.freeze({
    Root: DatePickerRoot, Trigger: DatePickerTrigger, Content: DatePickerContent,
    Grid: DatePickerGrid, Cell: DatePickerCell, MonthCell: DatePickerMonthCell,
    Previous: Object.freeze({ week: DatePickerPreviousWeek, month: DatePickerPreviousMonth, year: DatePickerPreviousYear }),
    Next: Object.freeze({ week: DatePickerNextWeek, month: DatePickerNextMonth, year: DatePickerNextYear }),
    ViewTrigger: Object.freeze({ week: DatePickerWeekViewTrigger, month: DatePickerMonthViewTrigger, year: DatePickerYearViewTrigger }),
    fields: Object.freeze([{ component: DatePickerInput, part: 'input', en: 'Date', ko: '날짜' }]),
    defaultValue: initialDate,
  }),
  'date-range-picker': Object.freeze({
    Root: DateRangePickerRoot, Trigger: DateRangePickerTrigger, Content: DateRangePickerContent,
    Grid: DateRangePickerGrid, Cell: DateRangePickerCell, MonthCell: DateRangePickerMonthCell,
    Previous: Object.freeze({ week: DateRangePickerPreviousWeek, month: DateRangePickerPreviousMonth, year: DateRangePickerPreviousYear }),
    Next: Object.freeze({ week: DateRangePickerNextWeek, month: DateRangePickerNextMonth, year: DateRangePickerNextYear }),
    ViewTrigger: Object.freeze({ week: DateRangePickerWeekViewTrigger, month: DateRangePickerMonthViewTrigger, year: DateRangePickerYearViewTrigger }),
    fields: Object.freeze([
      { component: DateRangePickerStartInput, part: 'start-input', en: 'Start date', ko: '시작 날짜' },
      { component: DateRangePickerEndInput, part: 'end-input', en: 'End date', ko: '종료 날짜' },
    ]),
    defaultValue: Object.freeze({ start: initialDate, end: endDate }),
  }),
  'date-time-picker': Object.freeze({
    Root: DateTimePickerRoot, Trigger: DateTimePickerTrigger, Content: DateTimePickerContent,
    Grid: DateTimePickerGrid, Cell: DateTimePickerCell, MonthCell: DateTimePickerMonthCell,
    Previous: Object.freeze({ week: DateTimePickerPreviousWeek, month: DateTimePickerPreviousMonth, year: DateTimePickerPreviousYear }),
    Next: Object.freeze({ week: DateTimePickerNextWeek, month: DateTimePickerNextMonth, year: DateTimePickerNextYear }),
    ViewTrigger: Object.freeze({ week: DateTimePickerWeekViewTrigger, month: DateTimePickerMonthViewTrigger, year: DateTimePickerYearViewTrigger }),
    fields: Object.freeze([
      { component: DateTimePickerDateInput, part: 'date-input', en: 'Date', ko: '날짜' },
      { component: DateTimePickerTimeInput, part: 'time-input', en: 'Time', ko: '시간' },
    ]),
    defaultValue: initialValue,
  }),
  'date-time-range-picker': Object.freeze({
    Root: DateTimeRangePickerRoot, Trigger: DateTimeRangePickerTrigger, Content: DateTimeRangePickerContent,
    Grid: DateTimeRangePickerGrid, Cell: DateTimeRangePickerCell, MonthCell: DateTimeRangePickerMonthCell,
    Previous: Object.freeze({ week: DateTimeRangePickerPreviousWeek, month: DateTimeRangePickerPreviousMonth, year: DateTimeRangePickerPreviousYear }),
    Next: Object.freeze({ week: DateTimeRangePickerNextWeek, month: DateTimeRangePickerNextMonth, year: DateTimeRangePickerNextYear }),
    ViewTrigger: Object.freeze({ week: DateTimeRangePickerWeekViewTrigger, month: DateTimeRangePickerMonthViewTrigger, year: DateTimeRangePickerYearViewTrigger }),
    fields: Object.freeze([
      { component: DateTimeRangePickerStartDateTimeInput, part: 'start-date-time-input', en: 'Start', ko: '시작' },
      { component: DateTimeRangePickerEndDateTimeInput, part: 'end-date-time-input', en: 'End', ko: '종료' },
    ]),
    defaultValue: Object.freeze({
      start: Object.freeze({ date: initialDate, time: initialTime }),
      end: Object.freeze({ date: endDate, time: endTime }),
    }),
  }),
});

const picker = computed(() => pickerCatalog[props.component]);
const fieldGroups = computed<readonly PickerFieldGroup[]>(() => {
  const fields = picker.value.fields;
  if (props.component === 'date-time-picker') {
    return Object.freeze([{ key: 'date-time', en: 'Date and time', ko: '날짜 및 시간', fields }]);
  }
  if (props.component === 'date-time-range-picker') {
    return fields.map((field) => Object.freeze({ key: field.part, en: field.en, ko: field.ko, fields: Object.freeze([field]) }));
  }
  return fields.map((field) => Object.freeze({ key: field.part, en: field.en, ko: field.ko, fields: Object.freeze([field]) }));
});
const fieldLayout = computed(() => `date-time-anatomy__fields--${fieldGroups.value.length}`);
const viewModes: readonly ViewMode[] = ['week', 'month', 'year'];

const weekdayLabels = {
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  ko: ['월', '화', '수', '목', '금', '토', '일'],
} as const;

const monthLabels = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'],
} as const;

function partClass(part: string, instance?: string): Record<string, boolean> {
  return {
    'anatomy-part-active': isPartActive(part, instance),
  };
}

function isPartActive(part: string, instance?: string): boolean {
  return props.activePart === part
    && (instance === undefined || activeInstance.value === instance);
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

function clearHover(): void {
  hoveredInstance.value = null;
  emit('hover', null);
}

function eventTarget(event: Event): HTMLElement | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>('[data-part]');
}

function titleFor(
  viewMode: DateTimePickerRootSlotProps['viewMode'],
  view: DateTimePickerRootSlotProps['view'],
  dates: DateTimePickerRootSlotProps['dates'],
): string {
  if (viewMode === 'year') return `${view.year}`;
  if (viewMode === 'month') {
    return props.korean
      ? `${view.year}년 ${view.month}월`
      : new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(view.year, view.month - 1, 1));
  }

  const days = dates.flat();
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) return '';
  return props.korean
    ? `${formatKoreanDate(first)}–${formatKoreanDate(last)}`
    : `${formatEnglishDate(first)} – ${formatEnglishDate(last)}`;
}

function formatKoreanDate(value: DateValue): string {
  return `${value.month}월 ${value.day}일`;
}

function formatEnglishDate(value: DateValue): string {
  return `${monthLabels.en[value.month - 1]} ${value.day}`;
}

function navigationLabel(viewMode: DateTimePickerRootSlotProps['viewMode'], direction: 'previous' | 'next'): string {
  const units = props.korean
    ? { week: '주', month: '달', year: '연도' }
    : { week: 'week', month: 'month', year: 'year' };
  const action = props.korean ? (direction === 'previous' ? '이전' : '다음') : direction;
  return `${action} ${units[viewMode]}`;
}

function navigationComponent(direction: 'previous' | 'next', viewMode: ViewMode): Component {
  return direction === 'previous'
    ? picker.value.Previous[viewMode]
    : picker.value.Next[viewMode];
}
</script>

<template>
  <component
    :is="picker.Root"
    :default-value="picker.defaultValue"
    :default-highlighted-value="initialDate"
    default-view="month"
    default-open
    v-slot="{ dates, months, view, viewMode }"
  >
    <div
      class="date-time-anatomy"
      @click.capture="inspect"
      @pointerover.capture="hover"
      @pointerleave="clearHover"
    >
      <div class="date-time-anatomy__fields" :class="fieldLayout">
        <div
          v-for="group in fieldGroups"
          :key="group.key"
          class="date-time-anatomy__field"
          role="group"
          :aria-label="korean ? group.ko : group.en"
        >
          <span class="date-time-anatomy__field-label">{{ korean ? group.ko : group.en }}</span>
          <div class="date-time-anatomy__input-group" :class="{ 'date-time-anatomy__input-group--compound': group.fields.length > 1 }">
            <div v-for="field in group.fields" :key="field.part" class="date-time-anatomy__input-frame">
              <component
                :is="field.component"
                class="date-time-anatomy__input"
                :class="partClass(field.part)"
                :aria-label="korean ? field.ko : field.en"
              />
              <span v-if="isPartActive(field.part)" class="date-time-anatomy__part-label anatomy-part-label">{{ field.part }}</span>
            </div>
          </div>
        </div>
        <component
          :is="picker.Trigger"
          class="date-time-anatomy__trigger"
          :class="partClass('trigger')"
          :aria-label="korean ? '달력 열기 또는 닫기' : 'Open or close calendar'"
        >
          <span v-if="isPartActive('trigger')" class="date-time-anatomy__part-label anatomy-part-label">trigger</span>
          <CalendarDays :size="19" aria-hidden="true" />
        </component>
      </div>

      <component :is="picker.Content" class="date-time-anatomy__content" :class="partClass('content')">
        <span v-if="isPartActive('content')" class="date-time-anatomy__part-label anatomy-part-label">content</span>
        <div class="date-time-anatomy__toolbar">
          <component
            :is="navigationComponent('previous', viewMode)"
            class="date-time-anatomy__navigation"
            :class="partClass(`previous-${viewMode}`)"
            :aria-label="navigationLabel(viewMode, 'previous')"
          >
            <span v-if="isPartActive(`previous-${viewMode}`)" class="date-time-anatomy__part-label anatomy-part-label">previous-{{ viewMode }}</span>
            <ChevronLeft :size="18" aria-hidden="true" />
          </component>

          <strong class="date-time-anatomy__title">{{ titleFor(viewMode, view, dates) }}</strong>

          <component
            :is="navigationComponent('next', viewMode)"
            class="date-time-anatomy__navigation"
            :class="partClass(`next-${viewMode}`)"
            :aria-label="navigationLabel(viewMode, 'next')"
          >
            <span v-if="isPartActive(`next-${viewMode}`)" class="date-time-anatomy__part-label anatomy-part-label">next-{{ viewMode }}</span>
            <ChevronRight :size="18" aria-hidden="true" />
          </component>
        </div>

        <div class="date-time-anatomy__view-switch" :aria-label="korean ? '달력 보기' : 'Calendar view'">
          <component
            v-for="mode in viewModes"
            :is="picker.ViewTrigger[mode]"
            :key="mode"
            class="date-time-anatomy__view-trigger"
            :class="partClass(`${mode}-view-trigger`)"
          >
            <span v-if="isPartActive(`${mode}-view-trigger`)" class="date-time-anatomy__part-label anatomy-part-label">{{ mode }}-view-trigger</span>
            {{ korean ? { week: '주', month: '월', year: '연도' }[mode] : { week: 'Week', month: 'Month', year: 'Year' }[mode] }}
          </component>
        </div>

        <component
          :is="picker.Grid"
          v-if="viewMode !== 'year'"
          class="date-time-anatomy__grid"
          :class="[partClass('grid'), { 'date-time-anatomy__grid--week': viewMode === 'week' }]"
        >
          <span v-if="isPartActive('grid')" class="date-time-anatomy__part-label anatomy-part-label">grid</span>
          <span
            v-for="weekday in (korean ? weekdayLabels.ko : weekdayLabels.en)"
            :key="weekday"
            class="date-time-anatomy__weekday"
            aria-hidden="true"
          >{{ weekday }}</span>
          <component
            :is="picker.Cell"
            v-for="day in dates.flat()"
            :key="`${day.year}-${day.month}-${day.day}`"
            :value="day"
            :data-anatomy-instance="`${day.year}-${day.month}-${day.day}`"
            class="date-time-anatomy__cell"
            :class="partClass('cell', `${day.year}-${day.month}-${day.day}`)"
          >
            <span v-if="isPartActive('cell', `${day.year}-${day.month}-${day.day}`)" class="date-time-anatomy__part-label anatomy-part-label">cell</span>
            {{ day.day }}
          </component>
        </component>

        <component :is="picker.Grid" v-else class="date-time-anatomy__month-grid" :class="partClass('grid')">
          <span v-if="isPartActive('grid')" class="date-time-anatomy__part-label anatomy-part-label">grid</span>
          <component
            :is="picker.MonthCell"
            v-for="month in months.flat()"
            :key="`${month.year}-${month.month}`"
            :value="month"
            :data-anatomy-instance="`${month.year}-${month.month}`"
            class="date-time-anatomy__month-cell"
            :class="partClass('month-cell', `${month.year}-${month.month}`)"
          >
            <span v-if="isPartActive('month-cell', `${month.year}-${month.month}`)" class="date-time-anatomy__part-label anatomy-part-label">month-cell</span>
            {{ korean ? monthLabels.ko[month.month - 1] : monthLabels.en[month.month - 1] }}
          </component>
        </component>
      </component>
    </div>
  </component>
</template>

<style>
.date-time-anatomy {
  position: relative;
  width: min(100%, 650px);
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg);
}

.date-time-anatomy,
.date-time-anatomy * { box-sizing: border-box; }
.date-time-anatomy button,
.date-time-anatomy input { font: inherit; }
.date-time-anatomy button { color: inherit; cursor: pointer; }

.date-time-anatomy__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  align-items: end;
  gap: 8px;
}
.date-time-anatomy__fields--2 { grid-template-columns: repeat(2, minmax(0, 1fr)) 44px; }
.date-time-anatomy__fields--2 .date-time-anatomy__trigger { grid-column: 3; grid-row: 1; }

.date-time-anatomy__field { display: grid; gap: 6px; min-width: 0; }
.date-time-anatomy__field-label {
  color: var(--vp-c-text-2);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .06em;
  text-transform: uppercase;
}
.date-time-anatomy__input-group { min-width: 0; }
.date-time-anatomy__input-group--compound {
  display: grid;
  overflow: hidden;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 0.48fr);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}
.date-time-anatomy__input-group--compound:focus-within {
  border-color: var(--vp-c-brand-1);
  box-shadow: inset 0 0 0 1px var(--vp-c-brand-1);
}
.date-time-anatomy__input-frame { position: relative; min-width: 0; }
.date-time-anatomy__input-group--compound .date-time-anatomy__input-frame + .date-time-anatomy__input-frame {
  border-left: 1px solid var(--vp-c-divider);
}
.date-time-anatomy__input-frame > .date-time-anatomy__part-label {
  top: -9px;
  right: 10px;
  left: auto;
}

.date-time-anatomy__input,
.date-time-anatomy__trigger,
.date-time-anatomy__navigation,
.date-time-anatomy__view-trigger,
.date-time-anatomy__cell,
.date-time-anatomy__month-cell {
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.date-time-anatomy__input {
  width: 100%;
  height: 44px;
  min-width: 0;
  padding: 0 13px;
  border-radius: 10px;
  outline: none;
  font-family: var(--vp-font-family-mono) !important;
}
.date-time-anatomy__input-group--compound .date-time-anatomy__input {
  border: 0;
  border-radius: 0;
  background: transparent;
}
.date-time-anatomy__input-group--compound .date-time-anatomy__input:focus-visible {
  outline-offset: -2px;
}

.date-time-anatomy__trigger,
.date-time-anatomy__navigation {
  display: inline-grid;
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 10px;
  place-items: center;
}

.date-time-anatomy__content {
  position: relative;
  display: grid;
  gap: 14px;
  margin-top: 8px;
  padding: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 14px;
  background: var(--vp-c-bg-soft);
}
.date-time-anatomy__content[hidden] { display: none; }

.date-time-anatomy__toolbar {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 44px;
  align-items: center;
  gap: 10px;
}
.date-time-anatomy__title { overflow: hidden; text-align: center; text-overflow: ellipsis; white-space: nowrap; }

.date-time-anatomy__view-switch {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  width: min(100%, 260px);
  margin: 0 auto;
  padding: 3px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg);
}

.date-time-anatomy__view-trigger {
  min-height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 12px !important;
  font-weight: 700;
}
.date-time-anatomy__view-trigger[data-state='active'] { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); }

.date-time-anatomy__grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  column-gap: 0;
  row-gap: 4px;
}
.date-time-anatomy__weekday {
  padding: 3px 0 5px;
  color: var(--vp-c-text-3);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}
.date-time-anatomy__cell {
  position: relative;
  min-width: 0;
  height: 38px;
  padding: 0;
  border: 0;
  border-radius: 9px;
  background: transparent;
  font-size: 13px !important;
}
.date-time-anatomy__cell:hover,
.date-time-anatomy__month-cell:hover { background: var(--vp-c-default-soft); }
.date-time-anatomy__cell[data-outside-month] { color: var(--vp-c-text-3); }
.date-time-anatomy__cell[data-selected],
.date-time-anatomy__month-cell[data-selected] { background: var(--vp-c-brand-1); color: white; }
.date-time-anatomy__cell[data-in-range]:not([data-selected]) {
  border-radius: 0;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.date-time-anatomy__cell[data-in-range]:not([data-selected]):nth-child(7n + 1) { border-radius: 9px 0 0 9px; }
.date-time-anatomy__cell[data-in-range]:not([data-selected]):nth-child(7n) { border-radius: 0 9px 9px 0; }
.date-time-anatomy__cell[data-selected][data-in-range]:has(+ .date-time-anatomy__cell[data-in-range]):not(:nth-child(7n)) {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.date-time-anatomy__cell[data-in-range] + .date-time-anatomy__cell[data-selected][data-in-range]:not(:nth-child(7n + 1)) {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.date-time-anatomy__cell[data-highlighted]:not([data-selected]),
.date-time-anatomy__month-cell[data-highlighted]:not([data-selected]) { box-shadow: inset 0 0 0 2px var(--vp-c-brand-1); }

.date-time-anatomy__month-grid { position: relative; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.date-time-anatomy__month-cell { min-height: 46px; border-radius: 10px; font-size: 13px !important; }

.date-time-anatomy__part-label {
  top: -14px;
  left: 10px;
  letter-spacing: 0;
  text-transform: none;
}

.date-time-anatomy__toolbar > :last-child .date-time-anatomy__part-label {
  right: 10px;
  left: auto;
}

.date-time-anatomy :is(button, input):focus-visible { outline: 2px solid var(--vp-c-brand-1); outline-offset: 2px; }

@media (max-width: 640px) {
  .date-time-anatomy { padding: 14px; }
  .date-time-anatomy__fields,
  .date-time-anatomy__fields--2 { grid-template-columns: minmax(0, 1fr) 44px; }
  .date-time-anatomy__field { grid-column: 1; }
  .date-time-anatomy__trigger { grid-column: 2; grid-row: 1; }
  .date-time-anatomy__content { padding: 12px; }
  .date-time-anatomy__cell { height: 34px; }
}
</style>
