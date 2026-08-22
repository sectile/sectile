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
    'DatePickerRoot, DatePickerInput, DatePickerTrigger, DatePickerContent, DatePickerPrevious, DatePickerNext, DatePickerGrid, DatePickerCell',
    `  <DatePickerRoot :default-value="initialDate" v-slot="{ month }">
    <DatePickerInput />
    <DatePickerTrigger>Choose date</DatePickerTrigger>
    <DatePickerContent>
      <DatePickerPrevious>Previous month</DatePickerPrevious>
      <DatePickerNext>Next month</DatePickerNext>
      <DatePickerGrid>
        <DatePickerCell v-for="day in month.flat()" :key="day.day" :value="day">
          {{ day.day }}
        </DatePickerCell>
      </DatePickerGrid>
    </DatePickerContent>
  </DatePickerRoot>`,
    `const initialDate = { year: 2026, month: 8, day: 22 }`,
  ),
  'date-range-picker': sfc(
    'DateRangePickerRoot, DateRangePickerStartInput, DateRangePickerEndInput, DateRangePickerTrigger, DateRangePickerContent, DateRangePickerGrid, DateRangePickerCell',
    `  <DateRangePickerRoot :default-value="initialRange" v-slot="{ month }">
    <DateRangePickerStartInput />
    <DateRangePickerEndInput />
    <DateRangePickerTrigger>Choose range</DateRangePickerTrigger>
    <DateRangePickerContent>
      <DateRangePickerGrid>
        <DateRangePickerCell v-for="day in month.flat()" :key="day.day" :value="day">
          {{ day.day }}
        </DateRangePickerCell>
      </DateRangePickerGrid>
    </DateRangePickerContent>
  </DateRangePickerRoot>`,
    `const initialRange = {
  start: { year: 2026, month: 8, day: 22 },
  end: { year: 2026, month: 8, day: 25 },
}`,
  ),
  'date-time-picker': sfc(
    'DateTimePickerRoot, DateTimePickerInput, DateTimePickerTimeInput, DateTimePickerTrigger',
    `  <DateTimePickerRoot :default-value="initialValue">
    <DateTimePickerInput />
    <DateTimePickerTimeInput />
    <DateTimePickerTrigger>Choose date and time</DateTimePickerTrigger>
  </DateTimePickerRoot>`,
    `const initialValue = {
  date: { year: 2026, month: 8, day: 22 },
  time: { hour: 9, minute: 30, second: 0, millisecond: 0 },
}`,
  ),
  'date-time-range-picker': sfc(
    'DateTimeRangePickerRoot, DateTimeRangePickerStartInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerEndInput, DateTimeRangePickerEndTimeInput, DateTimeRangePickerTrigger',
    `  <DateTimeRangePickerRoot :default-value="initialRange">
    <DateTimeRangePickerStartInput />
    <DateTimeRangePickerStartTimeInput />
    <DateTimeRangePickerEndInput />
    <DateTimeRangePickerEndTimeInput />
    <DateTimeRangePickerTrigger>Choose range</DateTimeRangePickerTrigger>
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
}`,
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
    'TooltipRoot, TooltipTrigger, TooltipContent',
    `  <TooltipRoot>
    <TooltipTrigger>Hover or focus</TooltipTrigger>
    <TooltipContent>Keyboard shortcut: ⌘K</TooltipContent>
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
