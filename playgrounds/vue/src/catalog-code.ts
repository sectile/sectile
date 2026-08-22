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
    `  <SelectRoot :items="items" default-value="stable">
    <SelectTrigger><SelectValue placeholder="Choose a channel" /></SelectTrigger>
    <SelectContent>
      <SelectItem v-for="item in items" :key="item" :value="item">
        {{ item }} <SelectItemIndicator>✓</SelectItemIndicator>
      </SelectItem>
    </SelectContent>
  </SelectRoot>`,
    `const items = ['alpha', 'beta', 'stable']`,
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
    `  <StepperRoot :items="steps" default-value="account">
    <StepperList>
      <StepperStep v-for="step in steps" :key="step" :value="step">{{ step }}</StepperStep>
    </StepperList>
    <StepperContent v-for="step in steps" :key="step" :value="step">
      Configure {{ step }}
    </StepperContent>
  </StepperRoot>`,
    `const steps = ['account', 'profile', 'review']`,
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
    `  <ToolbarRoot :items="['bold', 'italic', 'link']" label="Formatting">
    <ToolbarItem value="bold">Bold</ToolbarItem>
    <ToolbarItem value="italic">Italic</ToolbarItem>
    <ToolbarSeparator />
    <ToolbarItem value="link">Link</ToolbarItem>
  </ToolbarRoot>`,
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
    'DialogRoot, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose',
    `  <DialogRoot>
    <DialogTrigger>Open deployment</DialogTrigger>
    <DialogContent>
      <DialogTitle>Deployment</DialogTitle>
      <DialogDescription>Review the release before continuing.</DialogDescription>
      <DialogClose>Close</DialogClose>
    </DialogContent>
  </DialogRoot>`,
  ),
  'alert-dialog': sfc(
    'AlertDialogRoot, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogDescription, AlertDialogClose',
    `  <AlertDialogRoot>
    <AlertDialogTrigger>Delete project</AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogTitle>Delete project?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
      <AlertDialogClose>Cancel</AlertDialogClose>
    </AlertDialogContent>
  </AlertDialogRoot>`,
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
    `  <MultiThumbSliderRoot :thumbs="['minimum', 'maximum']" :default-value="[25, 75]">
    <MultiThumbSliderTrack>
      <MultiThumbSliderRange />
      <MultiThumbSliderThumb value="minimum" aria-label="Minimum" />
      <MultiThumbSliderThumb value="maximum" aria-label="Maximum" />
    </MultiThumbSliderTrack>
  </MultiThumbSliderRoot>`,
  ),
  menu: sfc(
    'MenuRoot, MenuItem, MenuSubContent, MenuSeparator',
    `  <MenuRoot :items="items">
    <MenuItem value="file">File</MenuItem>
    <MenuSubContent for="file">
      <MenuItem value="new">New</MenuItem>
      <MenuItem value="open">Open</MenuItem>
    </MenuSubContent>
    <MenuSeparator />
    <MenuItem value="help">Help</MenuItem>
  </MenuRoot>`,
    `const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
  { id: 'help', parentID: null },
]`,
  ),
  menubar: sfc(
    'MenubarRoot, MenubarItem, MenubarContent, MenubarSeparator',
    `  <MenubarRoot :items="items">
    <MenubarItem value="file">File</MenubarItem>
    <MenubarContent for="file">
      <MenubarItem value="new">New</MenubarItem>
      <MenubarSeparator />
      <MenubarItem value="open">Open</MenubarItem>
    </MenubarContent>
  </MenubarRoot>`,
    `const items = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
]`,
  ),
  'menu-button': sfc(
    'MenuButtonRoot, MenuButtonTrigger, MenuButtonContent, MenuItem',
    `  <MenuButtonRoot :items="items">
    <MenuButtonTrigger>Actions</MenuButtonTrigger>
    <MenuButtonContent>
      <MenuItem value="edit">Edit</MenuItem>
      <MenuItem value="duplicate">Duplicate</MenuItem>
    </MenuButtonContent>
  </MenuButtonRoot>`,
    `const items = [
  { id: 'edit', parentID: null },
  { id: 'duplicate', parentID: null },
]`,
  ),
  'navigation-menu': sfc(
    'NavigationMenuRoot, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink',
    `  <NavigationMenuRoot :items="items" label="Primary">
    <NavigationMenuList>
      <NavigationMenuItem>
        <NavigationMenuTrigger value="products" as="button">Products</NavigationMenuTrigger>
        <NavigationMenuContent for="products">
          <NavigationMenuLink value="overview" as="a" href="/overview">Overview</NavigationMenuLink>
          <NavigationMenuLink value="components" as="a" href="/components">Components</NavigationMenuLink>
        </NavigationMenuContent>
      </NavigationMenuItem>
      <NavigationMenuItem>
        <NavigationMenuLink value="docs" as="a" href="/docs">Documentation</NavigationMenuLink>
      </NavigationMenuItem>
    </NavigationMenuList>
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
    `  <FeedRoot :items="activities">
    <FeedLoadEarlier>Load earlier</FeedLoadEarlier>
    <FeedItem v-for="activity in activities" :key="activity" :value="activity">
      {{ activity }}
    </FeedItem>
    <FeedLoadNewer>Load newer</FeedLoadNewer>
  </FeedRoot>`,
    `const activities = ['Core published', 'DOM verified', 'Vue playground added']`,
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
    `  <ComboboxRoot :items="items" default-input-value="a">
    <ComboboxInput placeholder="Search channel" />
    <ComboboxContent>
      <ComboboxItem v-for="item in items" :key="item.id" :value="item.id">
        {{ item.label }}
      </ComboboxItem>
      <ComboboxEmpty>No results</ComboboxEmpty>
    </ComboboxContent>
  </ComboboxRoot>`,
    `const items = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
  { id: 'stable', label: 'Stable' },
]`,
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
