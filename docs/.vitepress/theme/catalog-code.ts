function sfc(imports: string, template: string, setup = ''): string {
  const setupSource = setup === '' ? '' : `\n${setup.trim()}\n`;
  const specifier = '@sectile/vue/' + moduleName(imports);
  return `<script setup lang="ts">
import { ${imports} } from '${specifier}'${setupSource}
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
    `  <TagsInputRoot :default-value="['Vue', 'DOM']" v-slot="{ value }">
    <TagsInputItem v-for="(_, index) in value" :key="index" :index="index">
      <TagsInputItemText />
      <TagsInputItemDelete aria-label="Remove tag">×</TagsInputItemDelete>
    </TagsInputItem>
    <TagsInputInput placeholder="Add tag" />
    <TagsInputClear>Clear all</TagsInputClear>
  </TagsInputRoot>`,
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
    `  <DatePickerRoot :default-value="initialDate" :default-open="true" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
    <div class="catalog-inline">
      <DatePickerInput class="catalog-input" />
      <DatePickerTrigger>Calendar</DatePickerTrigger>
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
    `  <DateRangePickerRoot :default-value="initialRange" :default-open="true" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
    <div class="catalog-inline">
      <DateRangePickerStartInput class="catalog-input" />
      <DateRangePickerEndInput class="catalog-input" />
      <DateRangePickerTrigger>Calendar</DateRangePickerTrigger>
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
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']`,
  ),
  'date-time-picker': sfc(
    'DateTimePickerRoot, DateTimePickerDateInput, DateTimePickerTimeInput, DateTimePickerTrigger, DateTimePickerContent, DateTimePickerPreviousWeek, DateTimePickerPreviousMonth, DateTimePickerPreviousYear, DateTimePickerNextWeek, DateTimePickerNextMonth, DateTimePickerNextYear, DateTimePickerWeekViewTrigger, DateTimePickerMonthViewTrigger, DateTimePickerYearViewTrigger, DateTimePickerGrid, DateTimePickerCell, DateTimePickerMonthCell',
    `  <DateTimePickerRoot :default-value="initialValue" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
    <div class="catalog-range-fields">
      <label class="catalog-field">
        <span>Date</span>
        <DateTimePickerDateInput class="catalog-input" />
      </label>
      <label class="catalog-field">
        <span>Time</span>
        <DateTimePickerTimeInput class="catalog-input" />
      </label>
      <DateTimePickerTrigger>Calendar</DateTimePickerTrigger>
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
    'DateTimeRangePickerRoot, DateTimeRangePickerStartDateInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerEndDateInput, DateTimeRangePickerEndTimeInput, DateTimeRangePickerTrigger, DateTimeRangePickerContent, DateTimeRangePickerPreviousWeek, DateTimeRangePickerPreviousMonth, DateTimeRangePickerPreviousYear, DateTimeRangePickerNextWeek, DateTimeRangePickerNextMonth, DateTimeRangePickerNextYear, DateTimeRangePickerWeekViewTrigger, DateTimeRangePickerMonthViewTrigger, DateTimeRangePickerYearViewTrigger, DateTimeRangePickerGrid, DateTimeRangePickerCell, DateTimeRangePickerMonthCell',
    `  <DateTimeRangePickerRoot :default-value="initialRange" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
    <div class="catalog-range-fields">
      <label class="catalog-endpoint">
        <span>Start</span>
        <DateTimeRangePickerStartDateInput class="catalog-input" />
        <DateTimeRangePickerStartTimeInput class="catalog-input catalog-time-input" />
      </label>
      <label class="catalog-endpoint">
        <span>End</span>
        <DateTimeRangePickerEndDateInput class="catalog-input" />
        <DateTimeRangePickerEndTimeInput class="catalog-input catalog-time-input" />
      </label>
      <DateTimeRangePickerTrigger>Calendar</DateTimeRangePickerTrigger>
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
  'tree-view': sfc(
    'TreeViewRoot, TreeViewItem, TreeViewDisclosure, TreeViewGroup',
    `  <TreeViewRoot :nodes="nodes" :default-expanded-value="['workspace']" v-slot="{ expandedValue }">
    <TreeViewItem value="workspace">
      <TreeViewDisclosure for="workspace">Toggle</TreeViewDisclosure>
      Workspace
    </TreeViewItem>
    <TreeViewGroup v-if="expandedValue.includes('workspace')">
      <TreeViewItem value="src">Source</TreeViewItem>
      <TreeViewItem value="tests">Tests</TreeViewItem>
    </TreeViewGroup>
  </TreeViewRoot>`,
    `const nodes = [
  { id: 'workspace', parentID: null },
  { id: 'src', parentID: 'workspace' },
  { id: 'tests', parentID: 'workspace' },
]`,
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
  'menu-button': menuButtonScenarioCode,
  popover: popoverScenarioCode,
});

/**
 * Returns the runnable Vue example for the exact documented scenario.
 * Scenario overrides must express real API or structure differences, not presentation-only labels.
 */
export function catalogCodeFor(component: string, scenario: string): string {
  return scenarioCode[component]?.[scenario] ?? catalogCode[component] ?? '';
}
