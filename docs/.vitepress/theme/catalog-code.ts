function sfc(imports: string, template: string, setup = ''): string {
  const setupSource = setup === '' ? '' : `\n${setup.trim()}\n`;
  const iconSource = template.includes('<CalendarDays')
    ? `\nimport { CalendarDays } from '@lucide/vue'`
    : '';
  const specifier = '@sectile/vue/' + moduleName(imports);
  return `<script setup lang="ts">
import { ${imports} } from '${specifier}'${iconSource}${setupSource}
</script>

<template>
${template.trim()}
</template>`;
}

function moduleName(imports: string): string {
  const root = imports.split(',')[0]?.trim().replace(/Root$/, '') ?? '';
  return root
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

export const catalogCode: Readonly<Record<string, string>> = Object.freeze({
  'checkbox-group': sfc(
    'CheckboxGroupRoot, CheckboxGroupItem, CheckboxGroupIndicator',
    `  <CheckboxGroupRoot :default-value="['dom']" name="packages">
    <CheckboxGroupItem v-for="item in items" :key="item.value" :value="item.value">
      <CheckboxGroupIndicator>✓</CheckboxGroupIndicator>
      {{ item.label }}
    </CheckboxGroupItem>
  </CheckboxGroupRoot>`,
    `const items = [
  { value: 'core', label: 'Core' },
  { value: 'dom', label: 'DOM' },
  { value: 'vue', label: 'Vue' },
]`,
  ),
  select: sfc(
    'SelectRoot, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectItemIndicator',
    `  <SelectRoot :items="environmentIDs" :text-value="environmentLabel" default-value="production">
    <SelectTrigger><SelectValue placeholder="Choose an environment" /></SelectTrigger>
    <SelectContent>
      <SelectItem v-for="item in environments" :key="item.id" :value="item.id">
        <strong>{{ item.label }}</strong>
        <small>{{ item.detail }}</small>
        <SelectItemIndicator>✓</SelectItemIndicator>
      </SelectItem>
    </SelectContent>
  </SelectRoot>`,
    `const environments = [
  { id: 'production', label: 'Production', detail: 'customer.app' },
  { id: 'staging', label: 'Staging', detail: 'staging.customer.app' },
  { id: 'development', label: 'Development', detail: 'Local workspace' },
]
const environmentIDs = environments.map(({ id }) => id)
const environmentLabel = (id: string) => environments.find(item => item.id === id)?.label ?? id`,
  ),
  pagination: sfc(
    'PaginationRoot, PaginationFirst, PaginationPrevious, PaginationItem, PaginationNext, PaginationLast',
    `  <PaginationRoot :total="240" :default-items-per-page="20" v-slot="{ items }">
    <PaginationFirst>First</PaginationFirst>
    <PaginationPrevious>Previous</PaginationPrevious>
    <template v-for="item in items.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
      <span v-if="item.type === 'ellipsis'" aria-hidden="true">…</span>
      <PaginationItem v-else :item="item">{{ item.page }}</PaginationItem>
    </template>
    <PaginationNext>Next</PaginationNext>
    <PaginationLast>Last</PaginationLast>
  </PaginationRoot>`,
  ),
  stepper: sfc(
    'StepperRoot, StepperList, StepperStep, StepperContent',
    `  <StepperRoot v-model="current" :items="stepIDs">
    <StepperList>
      <StepperStep v-for="(step, index) in steps" :key="step.id" :value="step.id">
        {{ index + 1 }}. {{ step.label }}
      </StepperStep>
    </StepperList>
    <StepperContent v-for="step in steps" :key="step.id" :value="step.id">
      <strong>{{ step.label }}</strong>
      <p>{{ step.detail }}</p>
      <button type="button" :disabled="step.id === 'review'" @click="advance(step.id)">
        {{ step.id === 'review' ? 'Checkout steps complete' : 'Continue' }}
      </button>
    </StepperContent>
  </StepperRoot>`,
    `import { ref } from 'vue'

const steps = [
  { id: 'account', label: 'Account', detail: 'Contact and sign-in details' },
  { id: 'delivery', label: 'Delivery', detail: 'Address and shipping method' },
  { id: 'payment', label: 'Payment', detail: 'Secure payment information' },
  { id: 'review', label: 'Review', detail: 'Confirm and place the order' },
]
const stepIDs = steps.map(({ id }) => id)
const current = ref('delivery')
const advance = (id: string) => {
  current.value = stepIDs[stepIDs.indexOf(id) + 1] ?? id
}`,
  ),
  rating: sfc(
    'RatingRoot, RatingItem, RatingIndicator, RatingClear',
    `  <RatingRoot :items="ratings" default-value="4" :clearable="true">
    <RatingItem v-for="value in ratings" :key="value" :value="value">
      ★<RatingIndicator />
    </RatingItem>
    <RatingClear>Clear rating</RatingClear>
  </RatingRoot>`,
    `const ratings = ['1', '2', '3', '4', '5']`,
  ),
  'pin-input': sfc(
    'PinInputRoot, PinInputInput',
    `  <PinInputRoot :length="6" default-value="12">
    <PinInputInput v-for="index in 6" :key="index" :index="index - 1" />
  </PinInputRoot>`,
  ),
  'tags-input': sfc(
    'TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput, TagsInputClear',
    `  <TagsInputRoot :default-value="['Vue', 'DOM', 'Accessibility']" label="Project skills" v-slot="{ value }">
    <TagsInputItem v-for="(_, index) in value" :key="index" :index="index">
      <TagsInputItemText />
      <TagsInputItemDelete :aria-label="\`Remove \${value[index]}\`">
        <X aria-hidden="true" />
      </TagsInputItemDelete>
    </TagsInputItem>
    <TagsInputInput placeholder="Add a skill…" />
    <TagsInputClear><Trash2 aria-hidden="true" /> Clear all</TagsInputClear>
  </TagsInputRoot>`,
    `import { Trash2, X } from '@lucide/vue'`,
  ),
  grid: sfc(
    'GridRoot, GridRow, GridCell',
    `  <GridRoot :rows="rows">
    <GridRow v-for="row in rows" :key="row[0]">
      <GridCell v-for="cell in row" :key="cell" :value="cell">{{ cell }}</GridCell>
    </GridRow>
  </GridRoot>`,
    `const rows = [['name', 'status'], ['Sectile', 'Ready']]`,
  ),
  toolbar: sfc(
    'ToolbarRoot, ToolbarItem, ToolbarSeparator',
    `  <ToolbarRoot :items="['bold', 'italic', 'link']" label="Formatting" @invoke="lastAction = $event">
    <ToolbarItem value="bold">Bold</ToolbarItem>
    <ToolbarItem value="italic">Italic</ToolbarItem>
    <ToolbarSeparator />
    <ToolbarItem value="link">Link</ToolbarItem>
  </ToolbarRoot>
  <p role="status">{{ lastAction ? lastAction + ' invoked' : 'Choose an action' }}</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')`,
  ),
  'window-splitter': sfc(
    'WindowSplitterRoot, WindowSplitterPane, WindowSplitterHandle',
    `  <WindowSplitterRoot :default-value="42">
    <WindowSplitterPane side="before">Navigator</WindowSplitterPane>
    <WindowSplitterHandle aria-label="Resize panels" />
    <WindowSplitterPane side="after">Editor</WindowSplitterPane>
  </WindowSplitterRoot>`,
  ),
  'date-picker': sfc(
    'DatePickerRoot, DatePickerInput, DatePickerTrigger, DatePickerContent, DatePickerPreviousWeek, DatePickerPreviousMonth, DatePickerPreviousYear, DatePickerNextWeek, DatePickerNextMonth, DatePickerNextYear, DatePickerWeekViewTrigger, DatePickerMonthViewTrigger, DatePickerYearViewTrigger, DatePickerGrid, DatePickerCell, DatePickerMonthCell',
    `  <DatePickerRoot :default-value="initialDate" :default-open="true" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
    <div class="catalog-inline">
      <DatePickerInput class="catalog-input" />
      <DatePickerTrigger class="catalog-picker-trigger" aria-label="Open date picker">
        <CalendarDays :size="18" aria-hidden="true" />
      </DatePickerTrigger>
    </div>
    <DatePickerContent class="catalog-popup catalog-picker-popup">
      <div class="catalog-picker-toolbar">
        <div class="catalog-inline">
          <DatePickerPreviousWeek v-if="viewMode === 'week'">‹</DatePickerPreviousWeek>
          <DatePickerPreviousMonth v-else-if="viewMode === 'month'">‹</DatePickerPreviousMonth>
          <DatePickerPreviousYear v-else>‹</DatePickerPreviousYear>
          <strong>{{ viewMode === 'year' ? view.year : monthNames[view.month - 1] + ' ' + view.year }}</strong>
          <DatePickerNextWeek v-if="viewMode === 'week'">›</DatePickerNextWeek>
          <DatePickerNextMonth v-else-if="viewMode === 'month'">›</DatePickerNextMonth>
          <DatePickerNextYear v-else>›</DatePickerNextYear>
        </div>
        <div class="catalog-view-switch">
          <DatePickerWeekViewTrigger>Week</DatePickerWeekViewTrigger>
          <DatePickerMonthViewTrigger>Month</DatePickerMonthViewTrigger>
          <DatePickerYearViewTrigger>Year</DatePickerYearViewTrigger>
        </div>
      </div>

      <DatePickerGrid v-if="viewMode !== 'year'" class="catalog-calendar" :data-view="viewMode">
        <DatePickerCell
          v-for="day in dates.flat()"
          :key="[day.year, day.month, day.day].join('-')"
          :value="day"
        >
          {{ day.day }}
        </DatePickerCell>
      </DatePickerGrid>
      <DatePickerGrid v-else class="catalog-month-grid">
        <DatePickerMonthCell
          v-for="month in months.flat()"
          :key="[month.year, month.month].join('-')"
          :value="month"
        >
          {{ monthNames[month.month - 1] }}
        </DatePickerMonthCell>
      </DatePickerGrid>
    </DatePickerContent>
  </DatePickerRoot>`,
    `const initialDate = { year: 2026, month: 8, day: 22 }
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'date-range-picker': sfc(
    'DateRangePickerRoot, DateRangePickerStartInput, DateRangePickerEndInput, DateRangePickerTrigger, DateRangePickerContent, DateRangePickerPreviousWeek, DateRangePickerPreviousMonth, DateRangePickerPreviousYear, DateRangePickerNextWeek, DateRangePickerNextMonth, DateRangePickerNextYear, DateRangePickerWeekViewTrigger, DateRangePickerMonthViewTrigger, DateRangePickerYearViewTrigger, DateRangePickerGrid, DateRangePickerCell, DateRangePickerMonthCell',
    `  <DateRangePickerRoot :default-value="initialRange" :policies="policies" :default-open="true" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
    <div class="catalog-inline">
      <DateRangePickerStartInput class="catalog-input" />
      <DateRangePickerEndInput class="catalog-input" />
      <DateRangePickerTrigger class="catalog-picker-trigger" aria-label="Open date range picker">
        <CalendarDays :size="18" aria-hidden="true" />
      </DateRangePickerTrigger>
    </div>
    <DateRangePickerContent class="catalog-popup catalog-picker-popup">
      <div class="catalog-picker-toolbar">
        <div class="catalog-inline">
          <DateRangePickerPreviousWeek v-if="viewMode === 'week'">‹</DateRangePickerPreviousWeek>
          <DateRangePickerPreviousMonth v-else-if="viewMode === 'month'">‹</DateRangePickerPreviousMonth>
          <DateRangePickerPreviousYear v-else>‹</DateRangePickerPreviousYear>
          <strong>{{ viewMode === 'year' ? view.year : monthNames[view.month - 1] + ' ' + view.year }}</strong>
          <DateRangePickerNextWeek v-if="viewMode === 'week'">›</DateRangePickerNextWeek>
          <DateRangePickerNextMonth v-else-if="viewMode === 'month'">›</DateRangePickerNextMonth>
          <DateRangePickerNextYear v-else>›</DateRangePickerNextYear>
        </div>
        <div class="catalog-view-switch">
          <DateRangePickerWeekViewTrigger>Week</DateRangePickerWeekViewTrigger>
          <DateRangePickerMonthViewTrigger>Month</DateRangePickerMonthViewTrigger>
          <DateRangePickerYearViewTrigger>Year</DateRangePickerYearViewTrigger>
        </div>
      </div>

      <DateRangePickerGrid v-if="viewMode !== 'year'" class="catalog-calendar" :data-view="viewMode">
        <DateRangePickerCell
          v-for="day in dates.flat()"
          :key="[day.year, day.month, day.day].join('-')"
          :value="day"
        >
          {{ day.day }}
        </DateRangePickerCell>
      </DateRangePickerGrid>
      <DateRangePickerGrid v-else class="catalog-month-grid">
        <DateRangePickerMonthCell
          v-for="month in months.flat()"
          :key="[month.year, month.month].join('-')"
          :value="month"
        >
          {{ monthNames[month.month - 1] }}
        </DateRangePickerMonthCell>
      </DateRangePickerGrid>
    </DateRangePickerContent>
  </DateRangePickerRoot>`,
    `const initialRange = {
  start: { year: 2026, month: 8, day: 22 },
  end: { year: 2026, month: 8, day: 25 },
}
const unavailableDates = new Set(['2026-08-27', '2026-08-29'])
const policies = {
  unavailable: (value: { year: number; month: number; day: number }) =>
    unavailableDates.has(
      [value.year, String(value.month).padStart(2, '0'), String(value.day).padStart(2, '0')].join('-'),
    ),
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'range-calendar': sfc(
    'RangeCalendarRoot, RangeCalendarContent, RangeCalendarPreviousMonth, RangeCalendarNextMonth, RangeCalendarGrid, RangeCalendarCell',
    `  <RangeCalendarRoot :default-value="stay" v-slot="{ dates, view }">
    <RangeCalendarContent>
      <header>
        <RangeCalendarPreviousMonth aria-label="Previous month">‹</RangeCalendarPreviousMonth>
        <strong>{{ view.year }}-{{ String(view.month).padStart(2, '0') }}</strong>
        <RangeCalendarNextMonth aria-label="Next month">›</RangeCalendarNextMonth>
      </header>
      <RangeCalendarGrid>
        <RangeCalendarCell v-for="day in dates.flat()" :key="JSON.stringify(day)" :value="day">
          {{ day.day }}
        </RangeCalendarCell>
      </RangeCalendarGrid>
    </RangeCalendarContent>
  </RangeCalendarRoot>`,
    `const stay = {
  start: { year: 2026, month: 8, day: 22 },
  end: { year: 2026, month: 8, day: 25 },
}`,
  ),
  'month-picker': sfc(
    'MonthPickerRoot, MonthPickerInput, MonthPickerTrigger, MonthPickerContent, MonthPickerPreviousYear, MonthPickerNextYear, MonthPickerGrid, MonthPickerCell',
    `  <MonthPickerRoot :default-value="billingMonth" default-open v-slot="{ months, view }">
    <MonthPickerInput aria-label="Billing month" />
    <MonthPickerTrigger class="catalog-picker-trigger" aria-label="Open month picker">
      <CalendarDays :size="18" aria-hidden="true" />
    </MonthPickerTrigger>
    <MonthPickerContent>
      <MonthPickerPreviousYear>‹</MonthPickerPreviousYear>
      <strong>{{ view.year }}</strong>
      <MonthPickerNextYear>›</MonthPickerNextYear>
      <MonthPickerGrid>
        <MonthPickerCell v-for="month in months.flat()" :key="month.year + '-' + month.month" :value="month">
          {{ monthNames[month.month - 1] }}
        </MonthPickerCell>
      </MonthPickerGrid>
    </MonthPickerContent>
  </MonthPickerRoot>`,
    `const billingMonth = { year: 2026, month: 8, day: 1 }
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'month-range-picker': sfc(
    'MonthRangePickerRoot, MonthRangePickerStartInput, MonthRangePickerEndInput, MonthRangePickerTrigger, MonthRangePickerContent, MonthRangePickerPreviousYear, MonthRangePickerNextYear, MonthRangePickerGrid, MonthRangePickerCell',
    `  <MonthRangePickerRoot :default-value="reportingPeriod" default-open v-slot="{ months, view }">
    <MonthRangePickerStartInput aria-label="First month" />
    <MonthRangePickerEndInput aria-label="Last month" />
    <MonthRangePickerTrigger class="catalog-picker-trigger" aria-label="Open month range picker">
      <CalendarDays :size="18" aria-hidden="true" />
    </MonthRangePickerTrigger>
    <MonthRangePickerContent>
      <MonthRangePickerPreviousYear aria-label="Previous year">‹</MonthRangePickerPreviousYear>
      <strong>{{ view.year }}</strong>
      <MonthRangePickerNextYear aria-label="Next year">›</MonthRangePickerNextYear>
      <MonthRangePickerGrid>
        <MonthRangePickerCell v-for="month in months.flat()" :key="month.year + '-' + month.month" :value="month">
          {{ monthNames[month.month - 1] }}
        </MonthRangePickerCell>
      </MonthRangePickerGrid>
    </MonthRangePickerContent>
  </MonthRangePickerRoot>`,
    `const reportingPeriod = {
  start: { year: 2026, month: 4, day: 1 },
  end: { year: 2026, month: 9, day: 1 },
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'year-picker': sfc(
    'YearPickerRoot, YearPickerInput, YearPickerTrigger, YearPickerContent, YearPickerPreviousPage, YearPickerNextPage, YearPickerGrid, YearPickerCell',
    `  <YearPickerRoot :default-value="graduationYear" default-open v-slot="{ years }">
    <YearPickerInput aria-label="Graduation year" />
    <YearPickerTrigger class="catalog-picker-trigger" aria-label="Open year picker">
      <CalendarDays :size="18" aria-hidden="true" />
    </YearPickerTrigger>
    <YearPickerContent>
      <YearPickerPreviousPage aria-label="Previous years">‹</YearPickerPreviousPage>
      <strong>{{ years.flat()[0].year }}–{{ years.flat().at(-1).year }}</strong>
      <YearPickerNextPage aria-label="Next years">›</YearPickerNextPage>
      <YearPickerGrid>
        <YearPickerCell v-for="year in years.flat()" :key="year.year" :value="year">
          {{ year.year }}
        </YearPickerCell>
      </YearPickerGrid>
    </YearPickerContent>
  </YearPickerRoot>`,
    `const graduationYear = { year: 2028, month: 1, day: 1 }`,
  ),
  'year-range-picker': sfc(
    'YearRangePickerRoot, YearRangePickerStartInput, YearRangePickerEndInput, YearRangePickerTrigger, YearRangePickerContent, YearRangePickerPreviousPage, YearRangePickerNextPage, YearRangePickerGrid, YearRangePickerCell',
    `  <YearRangePickerRoot :default-value="roadmap" default-open v-slot="{ years }">
    <YearRangePickerStartInput aria-label="First year" />
    <YearRangePickerEndInput aria-label="Last year" />
    <YearRangePickerTrigger class="catalog-picker-trigger" aria-label="Open year range picker">
      <CalendarDays :size="18" aria-hidden="true" />
    </YearRangePickerTrigger>
    <YearRangePickerContent>
      <YearRangePickerPreviousPage aria-label="Previous years">‹</YearRangePickerPreviousPage>
      <strong>{{ years.flat()[0].year }}–{{ years.flat().at(-1).year }}</strong>
      <YearRangePickerNextPage aria-label="Next years">›</YearRangePickerNextPage>
      <YearRangePickerGrid>
        <YearRangePickerCell v-for="year in years.flat()" :key="year.year" :value="year">
          {{ year.year }}
        </YearRangePickerCell>
      </YearRangePickerGrid>
    </YearRangePickerContent>
  </YearRangePickerRoot>`,
    `const roadmap = {
  start: { year: 2026, month: 1, day: 1 },
  end: { year: 2030, month: 1, day: 1 },
}`,
  ),
  'date-time-picker': sfc(
    'DateTimePickerRoot, DateTimePickerDateInput, DateTimePickerTimeInput, DateTimePickerTrigger, DateTimePickerContent, DateTimePickerPreviousWeek, DateTimePickerPreviousMonth, DateTimePickerPreviousYear, DateTimePickerNextWeek, DateTimePickerNextMonth, DateTimePickerNextYear, DateTimePickerWeekViewTrigger, DateTimePickerMonthViewTrigger, DateTimePickerYearViewTrigger, DateTimePickerGrid, DateTimePickerCell, DateTimePickerMonthCell',
    `  <DateTimePickerRoot :default-value="initialValue" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
    <div class="catalog-range-fields catalog-range-fields--single">
      <label class="catalog-endpoint">
        <span>Date and time</span>
        <span class="catalog-date-time-control">
          <DateTimePickerDateInput class="catalog-input" aria-label="Date" />
          <DateTimePickerTimeInput class="catalog-input catalog-time-input" aria-label="Time" />
        </span>
      </label>
      <DateTimePickerTrigger class="catalog-picker-trigger" aria-label="Open date and time picker">
        <CalendarDays :size="18" aria-hidden="true" />
      </DateTimePickerTrigger>
    </div>
    <DateTimePickerContent class="catalog-popup catalog-picker-popup">
      <div class="catalog-picker-toolbar">
        <div class="catalog-inline">
          <DateTimePickerPreviousWeek v-if="viewMode === 'week'">‹</DateTimePickerPreviousWeek>
          <DateTimePickerPreviousMonth v-else-if="viewMode === 'month'">‹</DateTimePickerPreviousMonth>
          <DateTimePickerPreviousYear v-else>‹</DateTimePickerPreviousYear>
          <strong>{{ viewMode === 'year' ? view.year : monthNames[view.month - 1] + ' ' + view.year }}</strong>
          <DateTimePickerNextWeek v-if="viewMode === 'week'">›</DateTimePickerNextWeek>
          <DateTimePickerNextMonth v-else-if="viewMode === 'month'">›</DateTimePickerNextMonth>
          <DateTimePickerNextYear v-else>›</DateTimePickerNextYear>
        </div>
        <div class="catalog-view-switch">
          <DateTimePickerWeekViewTrigger>Week</DateTimePickerWeekViewTrigger>
          <DateTimePickerMonthViewTrigger>Month</DateTimePickerMonthViewTrigger>
          <DateTimePickerYearViewTrigger>Year</DateTimePickerYearViewTrigger>
        </div>
      </div>

      <DateTimePickerGrid v-if="viewMode !== 'year'" class="catalog-calendar" :data-view="viewMode">
        <DateTimePickerCell
          v-for="day in dates.flat()"
          :key="[day.year, day.month, day.day].join('-')"
          :value="day"
        >
          {{ day.day }}
        </DateTimePickerCell>
      </DateTimePickerGrid>
      <DateTimePickerGrid v-else class="catalog-month-grid">
        <DateTimePickerMonthCell
          v-for="month in months.flat()"
          :key="[month.year, month.month].join('-')"
          :value="month"
        >
          {{ monthNames[month.month - 1] }}
        </DateTimePickerMonthCell>
      </DateTimePickerGrid>
    </DateTimePickerContent>
  </DateTimePickerRoot>`,
    `const initialValue = {
  date: { year: 2026, month: 8, day: 22 },
  time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'date-time-range-picker': sfc(
    'DateTimeRangePickerRoot, DateTimeRangePickerStartDateTimeInput, DateTimeRangePickerEndDateTimeInput, DateTimeRangePickerTrigger, DateTimeRangePickerContent, DateTimeRangePickerPreviousWeek, DateTimeRangePickerPreviousMonth, DateTimeRangePickerPreviousYear, DateTimeRangePickerNextWeek, DateTimeRangePickerNextMonth, DateTimeRangePickerNextYear, DateTimeRangePickerWeekViewTrigger, DateTimeRangePickerMonthViewTrigger, DateTimeRangePickerYearViewTrigger, DateTimeRangePickerGrid, DateTimeRangePickerCell, DateTimeRangePickerMonthCell',
    `  <DateTimeRangePickerRoot :default-value="initialRange" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
    <div class="catalog-range-fields">
      <label class="catalog-endpoint">
        <span>Start</span>
        <DateTimeRangePickerStartDateTimeInput class="catalog-input" aria-label="Start date and time" />
      </label>
      <label class="catalog-endpoint">
        <span>End</span>
        <DateTimeRangePickerEndDateTimeInput class="catalog-input" aria-label="End date and time" />
      </label>
      <DateTimeRangePickerTrigger class="catalog-picker-trigger" aria-label="Open date and time range picker">
        <CalendarDays :size="18" aria-hidden="true" />
      </DateTimeRangePickerTrigger>
    </div>
    <DateTimeRangePickerContent class="catalog-popup catalog-picker-popup">
      <div class="catalog-picker-toolbar">
        <div class="catalog-inline">
          <DateTimeRangePickerPreviousWeek v-if="viewMode === 'week'">‹</DateTimeRangePickerPreviousWeek>
          <DateTimeRangePickerPreviousMonth v-else-if="viewMode === 'month'">‹</DateTimeRangePickerPreviousMonth>
          <DateTimeRangePickerPreviousYear v-else>‹</DateTimeRangePickerPreviousYear>
          <strong>{{ viewMode === 'year' ? view.year : monthNames[view.month - 1] + ' ' + view.year }}</strong>
          <DateTimeRangePickerNextWeek v-if="viewMode === 'week'">›</DateTimeRangePickerNextWeek>
          <DateTimeRangePickerNextMonth v-else-if="viewMode === 'month'">›</DateTimeRangePickerNextMonth>
          <DateTimeRangePickerNextYear v-else>›</DateTimeRangePickerNextYear>
        </div>
        <div class="catalog-view-switch">
          <DateTimeRangePickerWeekViewTrigger>Week</DateTimeRangePickerWeekViewTrigger>
          <DateTimeRangePickerMonthViewTrigger>Month</DateTimeRangePickerMonthViewTrigger>
          <DateTimeRangePickerYearViewTrigger>Year</DateTimeRangePickerYearViewTrigger>
        </div>
      </div>

      <DateTimeRangePickerGrid v-if="viewMode !== 'year'" class="catalog-calendar" :data-view="viewMode">
        <DateTimeRangePickerCell
          v-for="day in dates.flat()"
          :key="[day.year, day.month, day.day].join('-')"
          :value="day"
        >
          {{ day.day }}
        </DateTimeRangePickerCell>
      </DateTimeRangePickerGrid>
      <DateTimeRangePickerGrid v-else class="catalog-month-grid">
        <DateTimeRangePickerMonthCell
          v-for="month in months.flat()"
          :key="[month.year, month.month].join('-')"
          :value="month"
        >
          {{ monthNames[month.month - 1] }}
        </DateTimeRangePickerMonthCell>
      </DateTimeRangePickerGrid>
    </DateTimeRangePickerContent>
  </DateTimeRangePickerRoot>`,
    `const initialRange = {
  start: {
    date: { year: 2026, month: 8, day: 22 },
    time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
  },
  end: {
    date: { year: 2026, month: 8, day: 25 },
    time: { hour: 17, minute: 30, second: 0, millisecond: 0 },
  },
}
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'quantity-field': sfc(
    'QuantityFieldRoot, QuantityFieldInput, QuantityFieldUnitSelect, QuantityFieldValue, createStandardQuantityPolicies',
    `  <QuantityFieldRoot
    :policies="policies"
    :default-value="{ value: '1.25', unit: 'metre' }"
    default-display-unit="centimetre"
  >
    <QuantityFieldInput />
    <QuantityFieldUnitSelect />
    <QuantityFieldValue />
  </QuantityFieldRoot>`,
    `const policies = createStandardQuantityPolicies('metre', 'metric')`,
  ),
  dialog: sfc(
    'DialogRoot, DialogTrigger, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose',
    `  <DialogRoot default-open>
    <DialogTrigger>Open deployment</DialogTrigger>
    <DialogOverlay class="dialog-overlay" />
    <DialogContent>
      <DialogTitle>Deployment</DialogTitle>
      <DialogDescription>Review the release before continuing.</DialogDescription>
      <DialogClose>Close</DialogClose>
    </DialogContent>
  </DialogRoot>`,
  ),
  'alert-dialog': sfc(
    'AlertDialogRoot, AlertDialogTrigger, AlertDialogOverlay, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogClose',
    `  <AlertDialogRoot>
    <AlertDialogTrigger>Delete project</AlertDialogTrigger>
    <AlertDialogOverlay class="dialog-overlay" />
    <AlertDialogContent>
      <AlertDialogTitle>Delete project?</AlertDialogTitle>
      <AlertDialogDescription>
        This permanently removes the project and its deployment history.
      </AlertDialogDescription>
      <div class="actions">
        <AlertDialogClose>Cancel</AlertDialogClose>
        <AlertDialogClose class="danger">Delete project</AlertDialogClose>
      </div>
    </AlertDialogContent>
  </AlertDialogRoot>`,
  ),
  popover: sfc(
    'PopoverRoot, PopoverTrigger, PopoverContent, PopoverArrow, PopoverTitle, PopoverDescription, PopoverClose',
    `  <PopoverRoot default-open side="bottom" align="center" :close-on-interact-outside="false">
    <PopoverTrigger>Edit profile</PopoverTrigger>
    <PopoverContent>
      <PopoverArrow />
      <PopoverTitle>Profile details</PopoverTitle>
      <PopoverDescription>Change the public display name.</PopoverDescription>
      <label>Display name <input value="Sectile" /></label>
      <PopoverClose>Save changes</PopoverClose>
    </PopoverContent>
  </PopoverRoot>`,
  ),
  tooltip: sfc(
    'TooltipRoot, TooltipTrigger, TooltipContent, TooltipArrow',
    `  <TooltipRoot side="top">
    <TooltipTrigger>Hover or focus</TooltipTrigger>
    <TooltipContent>
      <TooltipArrow />
      Keyboard shortcut: ⌘K
    </TooltipContent>
  </TooltipRoot>`,
  ),
  'multi-thumb-slider': sfc(
    'MultiThumbSliderRoot, MultiThumbSliderTrack, MultiThumbSliderRange, MultiThumbSliderThumb',
    `  <MultiThumbSliderRoot :thumbs="['minimum', 'maximum']" :default-value="[30, 70]" :policies="{ minGap: 5 }">
    <MultiThumbSliderTrack>
      <MultiThumbSliderRange />
      <MultiThumbSliderThumb value="minimum" aria-label="Minimum" />
      <MultiThumbSliderThumb value="maximum" aria-label="Maximum" />
    </MultiThumbSliderTrack>
  </MultiThumbSliderRoot>`,
  ),
  menu: sfc(
    'MenuRoot, MenuItem, MenuSubContent, MenuSeparator',
    `  <MenuRoot :items="items" @invoke="lastAction = $event">
    <MenuItem value="file">File</MenuItem>
    <MenuSubContent for="file">
      <MenuItem value="new">New</MenuItem>
      <MenuItem value="open">Open</MenuItem>
    </MenuSubContent>
    <MenuSeparator />
    <MenuItem value="help">Help</MenuItem>
  </MenuRoot>
  <p role="status">{{ lastAction ? lastAction + ' invoked' : 'Choose an action' }}</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
  { id: 'help', parentID: null },
]`,
  ),
  menubar: sfc(
    'MenubarRoot, MenubarItem, MenubarContent, MenubarSeparator',
    `  <MenubarRoot
    :items="items"
    :text-value="textValue"
    default-highlighted-value="file"
    label="Application commands"
    @invoke="lastAction = $event"
  >
    <MenubarItem value="file" as="button">File</MenubarItem>
    <MenubarContent for="file">
      <MenubarItem value="new-project" as="button">New project</MenubarItem>
      <MenubarSeparator />
      <MenubarItem value="open-project" as="button">Open project</MenubarItem>
    </MenubarContent>
    <MenubarItem value="edit" as="button">Edit</MenubarItem>
    <MenubarContent for="edit">
      <MenubarItem value="undo" as="button">Undo</MenubarItem>
      <MenubarItem value="redo" as="button">Redo</MenubarItem>
    </MenubarContent>
    <MenubarItem value="help" as="button">Help</MenubarItem>
    <MenubarContent for="help">
      <MenubarItem value="shortcuts" as="button">Keyboard shortcuts</MenubarItem>
    </MenubarContent>
  </MenubarRoot>
  <p role="status">{{ lastAction ? lastAction + ' invoked' : 'Choose an action' }}</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'file', parentID: null },
  { id: 'new-project', parentID: 'file' },
  { id: 'open-project', parentID: 'file' },
  { id: 'edit', parentID: null },
  { id: 'undo', parentID: 'edit' },
  { id: 'redo', parentID: 'edit' },
  { id: 'help', parentID: null },
  { id: 'shortcuts', parentID: 'help' },
]

const labels = {
  file: 'File',
  'new-project': 'New project',
  'open-project': 'Open project',
  edit: 'Edit',
  undo: 'Undo',
  redo: 'Redo',
  help: 'Help',
  shortcuts: 'Keyboard shortcuts',
}
const textValue = id => labels[id] ?? id`,
  ),
  'menu-button': sfc(
    'MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenuItem, MenuSeparator',
    `  <MenuButtonRoot :items="items" @invoke="lastAction = $event">
    <MenuButtonTrigger>Create</MenuButtonTrigger>
    <MenuButtonContent>
      <MenuItem value="new-file">New file <kbd>⌘N</kbd></MenuItem>
      <MenuItem value="new-folder">New folder <kbd>⇧⌘N</kbd></MenuItem>
      <MenuSeparator />
      <MenuItem value="import">Import…</MenuItem>
    </MenuButtonContent>
  </MenuButtonRoot>
  <p v-if="lastAction" role="status">{{ lastAction }} invoked</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'new-file', parentID: null },
  { id: 'new-folder', parentID: null },
  { id: 'import', parentID: null },
]`,
  ),
  'navigation-menu': sfc(
    'NavigationMenuRoot, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuViewport, NavigationMenuLink',
    `  <NavigationMenuRoot :items="items" label="Primary" v-slot="{ openPath }">
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger value="products" as="button">Products</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink value="docs" as="a" href="/docs">Documentation</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
    <NavigationMenuViewport v-show="openPath.includes('products')">
      <NavigationMenuContent for="products">
        <NavigationMenuLink value="overview" as="a" href="/overview">Overview</NavigationMenuLink>
        <NavigationMenuLink value="components" as="a" href="/components">Components</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuViewport>
  </NavigationMenuRoot>`,
    `const items = [
  { id: 'products', parentID: null },
  { id: 'overview', parentID: 'products' },
  { id: 'components', parentID: 'products' },
  { id: 'docs', parentID: null },
]`,
  ),
  carousel: sfc(
    'CarouselRoot, CarouselTrack, CarouselSlide, CarouselPrevious, CarouselNext, CarouselPause, CarouselIndicatorGroup, CarouselIndicator',
    `  <CarouselRoot :slides="slides" default-value="foundation">
    <CarouselTrack>
      <CarouselSlide v-for="slide in slides" :key="slide" :value="slide">
        {{ slide }}
      </CarouselSlide>
    </CarouselTrack>
    <CarouselPrevious>Previous</CarouselPrevious>
    <CarouselNext>Next</CarouselNext>
    <CarouselPause>Pause</CarouselPause>
    <CarouselIndicatorGroup>
      <CarouselIndicator v-for="slide in slides" :key="slide" :value="slide">
        {{ slide }}
      </CarouselIndicator>
    </CarouselIndicatorGroup>
  </CarouselRoot>`,
    `const slides = ['foundation', 'adapters', 'frameworks']`,
  ),
  feed: sfc(
    'FeedRoot, FeedItem, FeedLoadEarlier, FeedLoadNewer',
    `  <FeedRoot :items="activities" :revision="revision" @request-window="loadWindow">
    <FeedLoadEarlier v-if="!activities.includes('audit')">Load earlier</FeedLoadEarlier>
    <FeedItem v-for="activity in activities" :key="activity" :value="activity">
      {{ activityLabels[activity] }}
    </FeedItem>
    <FeedLoadNewer v-if="!activities.includes('deploy')">Load newer</FeedLoadNewer>
  </FeedRoot>`,
    `import { ref } from 'vue'

const activities = ref(['build', 'review', 'release'])
const revision = ref(0)
const activityLabels: Record<string, string> = {
  deploy: 'Production deployment started',
  build: 'Production build completed',
  review: 'Pull request approved',
  release: 'Version 0.2.0 published',
  audit: 'Accessibility audit completed',
}
const loadWindow = (direction: 'before' | 'after') => {
  activities.value = direction === 'before'
    ? [...activities.value, 'audit']
    : ['deploy', ...activities.value]
  revision.value += 1
}`,
  ),
  form: sfc(
    'FormRoot, FormField, FormLabel, FormDescription, FormMessage, FormSummary, FormSubmit',
    `  <FormRoot @submit="saveAccount">
    <FormSummary v-slot="{ state }">
      {{ state.issues.map(issue => issue.message).join(' ') }}
    </FormSummary>

    <FormField id="account-name" name="name">
      <FormLabel>Display name</FormLabel>
      <input name="name" value="Mina Kim" minlength="2" required>
      <FormDescription>Shown to teammates in release activity.</FormDescription>
      <FormMessage />
    </FormField>

    <FormField id="account-email" name="email">
      <FormLabel>Email address</FormLabel>
      <input name="email" value="mina@sectile.dev" type="email" required>
      <FormDescription>Receives deployment notifications.</FormDescription>
      <FormMessage />
    </FormField>

    <button type="reset">Reset</button>
    <FormSubmit>Save settings</FormSubmit>
  </FormRoot>`,
    `function saveAccount({ event, formData }: { event: SubmitEvent; formData: FormData }) {
  event.preventDefault()
  console.log(Object.fromEntries(formData))
}`,
  ),
  calendar: sfc(
    'CalendarRoot, CalendarCell',
    `  <CalendarRoot :rows="weeks" default-value="2026-08-22">
    <CalendarCell v-for="day in weeks.flat()" :key="day" :value="day">
      {{ day.slice(-2) }}
    </CalendarCell>
  </CalendarRoot>`,
    `const weeks = [[
  '2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20',
  '2026-08-21', '2026-08-22', '2026-08-23',
]]`,
  ),
  combobox: sfc(
    'ComboboxRoot, ComboboxInput, ComboboxContent, ComboboxItem, ComboboxEmpty',
    `  <ComboboxRoot :items="environmentIDs" :text-value="environmentLabel" default-input-value="pro">
    <ComboboxInput placeholder="Search environments" />
    <ComboboxContent>
      <ComboboxItem v-for="item in environments" :key="item.id" :value="item.id">
        <strong>{{ item.label }}</strong>
        <small>{{ item.detail }}</small>
      </ComboboxItem>
      <ComboboxEmpty>No matching environment</ComboboxEmpty>
    </ComboboxContent>
  </ComboboxRoot>`,
    `const environments = [
  { id: 'production', label: 'Production', detail: 'customer.app' },
  { id: 'staging', label: 'Staging', detail: 'staging.customer.app' },
  { id: 'development', label: 'Development', detail: 'Local workspace' },
]
const environmentIDs = environments.map(({ id }) => id)
const environmentLabel = (id: string) => environments.find(item => item.id === id)?.label ?? id`,
  ),
  'tree-grid': sfc(
    'TreeGridRoot, TreeGridRow, TreeGridCell, TreeGridDisclosure, TreeGridEditor',
    `  <TreeGridRoot
    :rows="rows"
    :get-cell-value="id => values.get(id) ?? ''"
    :set-cell-value="(id, value) => values.set(id, value)"
    :default-expanded-value="['workspace']"
    v-slot="{ expandedValue }"
  >
    <TreeGridRow value="workspace" :row-index="1" :expandable="true">
      <TreeGridCell value="workspace-name" :column-index="1">
        <TreeGridDisclosure for="workspace">Toggle Workspace</TreeGridDisclosure>
        Workspace
        <TreeGridEditor for="workspace-name" label="Workspace name" />
      </TreeGridCell>
      <TreeGridCell value="workspace-status" :column-index="2">Ready</TreeGridCell>
    </TreeGridRow>
    <TreeGridRow
      v-if="expandedValue.includes('workspace')"
      value="src"
      :row-index="2"
      :level="2"
    >
      <TreeGridCell value="src-name" :column-index="1">Source</TreeGridCell>
      <TreeGridCell value="src-status" :column-index="2">Active</TreeGridCell>
    </TreeGridRow>
  </TreeGridRoot>`,
    `const rows = [
  { id: 'workspace', parentID: null, cells: ['workspace-name', 'workspace-status'] },
  { id: 'src', parentID: 'workspace', cells: ['src-name', 'src-status'] },
]
const values = new Map([
  ['workspace-name', 'Workspace'],
  ['workspace-status', 'Ready'],
  ['src-name', 'Source'],
  ['src-status', 'Active'],
])`,
  ),
});

const dialogScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  modal: sfc(
    'DialogRoot, DialogTrigger, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose',
    `  <DialogRoot default-open>
    <DialogTrigger>Open deployment</DialogTrigger>
    <DialogOverlay class="dialog-overlay" />
    <DialogContent>
      <DialogTitle>Deployment</DialogTitle>
      <DialogDescription>Review the release before continuing.</DialogDescription>
      <DialogClose>Close</DialogClose>
    </DialogContent>
  </DialogRoot>`,
  ),
  'non-modal': sfc(
    'DialogRoot, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose',
    `  <DialogRoot default-open :modal="false">
    <DialogTrigger>Open deployment details</DialogTrigger>
    <DialogContent>
      <DialogTitle>Deployment details</DialogTitle>
      <DialogDescription>
        Keep the page interactive while these details remain open.
      </DialogDescription>
      <DialogClose>Close</DialogClose>
    </DialogContent>
  </DialogRoot>`,
  ),
  controlled: sfc(
    'DialogRoot, DialogTrigger, DialogOverlay, DialogContent, DialogTitle, DialogDescription, DialogClose',
    `  <DialogRoot v-model:open="open">
    <DialogTrigger>Open deployment</DialogTrigger>
    <DialogOverlay class="dialog-overlay" />
    <DialogContent>
      <DialogTitle>Deployment</DialogTitle>
      <DialogDescription>Review the release before continuing.</DialogDescription>
      <DialogClose>Close</DialogClose>
    </DialogContent>
  </DialogRoot>`,
    `import { ref } from 'vue'

const open = ref(false)`,
  ),
});

const alertDialogScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  destructive: catalogCode['alert-dialog'] ?? '',
  unsaved: sfc(
    'AlertDialogRoot, AlertDialogTrigger, AlertDialogOverlay, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogClose',
    `  <AlertDialogRoot>
    <AlertDialogTrigger>Discard draft</AlertDialogTrigger>
    <AlertDialogOverlay class="dialog-overlay" />
    <AlertDialogContent>
      <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
      <AlertDialogDescription>
        Your edits to Release 0.3 will be lost.
      </AlertDialogDescription>
      <div class="actions">
        <AlertDialogClose>Keep editing</AlertDialogClose>
        <AlertDialogClose class="warning">Discard changes</AlertDialogClose>
      </div>
    </AlertDialogContent>
  </AlertDialogRoot>`,
  ),
  controlled: sfc(
    'AlertDialogRoot, AlertDialogTrigger, AlertDialogOverlay, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogClose',
    `  <AlertDialogRoot v-model:open="open">
    <AlertDialogTrigger>Delete project</AlertDialogTrigger>
    <AlertDialogOverlay class="dialog-overlay" />
    <AlertDialogContent>
      <AlertDialogTitle>Delete project?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
      <AlertDialogClose>Cancel</AlertDialogClose>
    </AlertDialogContent>
  </AlertDialogRoot>`,
    `import { ref } from 'vue'

const open = ref(false)`,
  ),
});

const menuButtonScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  actions: catalogCode['menu-button'] ?? '',
  nested: sfc(
    'MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenuItem, MenuSeparator, MenuSubContent',
    `  <MenuButtonRoot :items="items" default-open @invoke="lastAction = $event">
    <MenuButtonTrigger>Export options</MenuButtonTrigger>
    <MenuButtonContent>
      <MenuItem value="download">Download copy <kbd>⇧D</kbd></MenuItem>
      <MenuItem value="share">Share link <kbd>⌘L</kbd></MenuItem>
      <MenuSeparator />
      <MenuItem value="export">Export as ›</MenuItem>
      <MenuSubContent for="export">
        <MenuItem value="pdf">PDF document</MenuItem>
        <MenuItem value="markdown">Markdown</MenuItem>
        <MenuItem value="csv">CSV data</MenuItem>
      </MenuSubContent>
    </MenuButtonContent>
  </MenuButtonRoot>
  <p v-if="lastAction" role="status">{{ lastAction }} invoked</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'download', parentID: null },
  { id: 'share', parentID: null },
  { id: 'export', parentID: null },
  { id: 'pdf', parentID: 'export' },
  { id: 'markdown', parentID: 'export' },
  { id: 'csv', parentID: 'export' },
]`,
  ),
});

const menuScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  commands: sfc(
    'MenuRoot, MenuItem, MenuSeparator',
    `  <MenuRoot :items="items" @invoke="lastAction = $event">
    <MenuItem value="new-project">New project <kbd>⌘N</kbd></MenuItem>
    <MenuItem value="open-project">Open project <kbd>⌘O</kbd></MenuItem>
    <MenuSeparator />
    <MenuItem value="save-project">Save project <kbd>⌘S</kbd></MenuItem>
  </MenuRoot>
  <p v-if="lastAction" role="status">{{ lastAction }} invoked</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'new-project', parentID: null },
  { id: 'open-project', parentID: null },
  { id: 'save-project', parentID: null },
]`,
  ),
  nested: sfc(
    'MenuRoot, MenuItem, MenuSubContent, MenuSeparator',
    `  <MenuRoot :items="items" @invoke="lastAction = $event">
    <MenuItem value="export">Export as ›</MenuItem>
    <MenuSubContent for="export">
      <MenuItem value="pdf">PDF document</MenuItem>
      <MenuItem value="markdown">Markdown</MenuItem>
      <MenuItem value="csv">CSV data</MenuItem>
    </MenuSubContent>
    <MenuSeparator />
    <MenuItem value="share">Share link <kbd>⌘L</kbd></MenuItem>
  </MenuRoot>
  <p v-if="lastAction" role="status">{{ lastAction }} invoked</p>`,
    `import { ref } from 'vue'

const lastAction = ref('')
const items = [
  { id: 'export', parentID: null },
  { id: 'pdf', parentID: 'export' },
  { id: 'markdown', parentID: 'export' },
  { id: 'csv', parentID: 'export' },
  { id: 'share', parentID: null },
]`,
  ),
});

const toolbarScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  formatting: sfc(
    'ToolbarRoot, ToolbarItem, ToolbarSeparator',
    `  <ToolbarRoot :items="items" label="Text formatting" @invoke="lastAction = $event">
    <ToolbarItem value="bold"><strong>B</strong><span class="sr-only">Bold</span></ToolbarItem>
    <ToolbarItem value="italic"><em>I</em><span class="sr-only">Italic</span></ToolbarItem>
    <ToolbarSeparator />
    <ToolbarItem value="link">Link</ToolbarItem>
    </ToolbarRoot>
  <p v-if="lastAction" role="status">{{ lastAction }} applied</p>`,
    `import { ref } from 'vue'

const items = ['bold', 'italic', 'link']
const lastAction = ref('')`,
  ),
  vertical: sfc(
    'ToolbarRoot, ToolbarItem, ToolbarSeparator',
    `  <ToolbarRoot :items="items" orientation="vertical" label="Canvas tools" @invoke="activeTool = $event">
    <ToolbarItem value="select">Select</ToolbarItem>
    <ToolbarItem value="comment">Comment</ToolbarItem>
    <ToolbarSeparator />
    <ToolbarItem value="upload">Upload</ToolbarItem>
    </ToolbarRoot>
  <p role="status">Active tool: {{ activeTool }}</p>`,
    `import { ref } from 'vue'

const items = ['select', 'comment', 'upload']
const activeTool = ref('select')`,
  ),
});

const navigationMenuScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  product: sfc(
    'NavigationMenuRoot, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuViewport, NavigationMenuLink',
    `  <NavigationMenuRoot :items="items" label="Product navigation" v-slot="{ openPath }">
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger value="products" as="button">Products</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink value="docs" as="a" href="/docs">Documentation</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
    <NavigationMenuViewport v-show="openPath.includes('products')">
      <NavigationMenuContent for="products">
        <NavigationMenuLink value="releases" as="a" href="/releases">New releases</NavigationMenuLink>
        <NavigationMenuLink value="open-source" as="a" href="/open-source">Open source</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuViewport>
  </NavigationMenuRoot>`,
    `const items = [
  { id: 'products', parentID: null },
  { id: 'releases', parentID: 'products' },
  { id: 'open-source', parentID: 'products' },
  { id: 'docs', parentID: null },
]`,
  ),
  links: sfc(
    'NavigationMenuRoot, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuViewport, NavigationMenuLink',
    `  <NavigationMenuRoot :items="items" label="Developer resources" v-slot="{ openPath }">
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger value="resources" as="button">Resources</NavigationMenuTrigger>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink value="github" as="a" href="https://github.com/sectile">GitHub</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
    <NavigationMenuViewport v-show="openPath.includes('resources')">
      <NavigationMenuContent for="resources">
        <NavigationMenuLink value="guides" as="a" href="/guide">Guides</NavigationMenuLink>
        <NavigationMenuLink value="api" as="a" href="/api">API reference</NavigationMenuLink>
      </NavigationMenuContent>
    </NavigationMenuViewport>
  </NavigationMenuRoot>`,
    `const items = [
  { id: 'resources', parentID: null },
  { id: 'guides', parentID: 'resources' },
  { id: 'api', parentID: 'resources' },
  { id: 'github', parentID: null },
]`,
  ),
});

const popoverScenarioCode: Readonly<Record<string, string>> = Object.freeze({
  anchored: catalogCode['popover'] ?? '',
  collision: sfc(
    'PopoverRoot, PopoverTrigger, PopoverContent, PopoverArrow, PopoverTitle, PopoverDescription, PopoverClose',
    `  <PopoverRoot
    default-open
    side="right"
    align="center"
    :collision-padding="16"
    :avoid-collisions="true"
    :close-on-interact-outside="false"
  >
    <PopoverTrigger>Edit profile</PopoverTrigger>
    <PopoverContent>
      <PopoverArrow />
      <PopoverTitle>Profile details</PopoverTitle>
      <PopoverDescription>Flip or shift when space runs out.</PopoverDescription>
      <PopoverClose>Done</PopoverClose>
    </PopoverContent>
  </PopoverRoot>`,
  ),
  controlled: sfc(
    'PopoverRoot, PopoverTrigger, PopoverContent, PopoverArrow, PopoverTitle, PopoverDescription, PopoverClose',
    `  <PopoverRoot v-model:open="open" side="bottom" align="center">
    <PopoverTrigger>Edit profile</PopoverTrigger>
    <PopoverContent>
      <PopoverArrow />
      <PopoverTitle>Profile details</PopoverTitle>
      <PopoverDescription>Change the public display name.</PopoverDescription>
      <PopoverClose>Save changes</PopoverClose>
    </PopoverContent>
  </PopoverRoot>`,
    `import { ref } from 'vue'

const open = ref(false)`,
  ),
});

const scenarioCode: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  dialog: dialogScenarioCode,
  'alert-dialog': alertDialogScenarioCode,
  menu: menuScenarioCode,
  'menu-button': menuButtonScenarioCode,
  'navigation-menu': navigationMenuScenarioCode,
  popover: popoverScenarioCode,
  toolbar: toolbarScenarioCode,
});

/**
 * Returns the runnable Vue example for the exact documented scenario.
 * Scenario overrides must express real API or structure differences, not presentation-only labels.
 */
export function catalogCodeFor(component: string, scenario: string): string {
  return scenarioCode[component]?.[scenario] ?? catalogCode[component] ?? '';
}
