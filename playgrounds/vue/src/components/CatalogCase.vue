<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight } from '@lucide/vue';
import { CheckboxGroupIndicator, CheckboxGroupItem, CheckboxGroupRoot } from '@sectile/vue/checkbox-group';
import { SelectContent, SelectItem, SelectItemIndicator, SelectRoot, SelectTrigger, SelectValue } from '@sectile/vue/select';
import { PaginationFirst, PaginationItem, PaginationLast, PaginationNext, PaginationPrevious, PaginationRoot } from '@sectile/vue/pagination';
import { StepperContent, StepperList, StepperRoot, StepperStep } from '@sectile/vue/stepper';
import { RatingClear, RatingIndicator, RatingItem, RatingRoot } from '@sectile/vue/rating';
import { PinInputInput, PinInputRoot } from '@sectile/vue/pin-input';
import { TagsInputClear, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from '@sectile/vue/tags-input';
import { GridCell, GridRoot, GridRow } from '@sectile/vue/grid';
import { ToolbarItem, ToolbarRoot, ToolbarSeparator } from '@sectile/vue/toolbar';
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '@sectile/vue/window-splitter';
import { DatePickerCell, DatePickerContent, DatePickerGrid, DatePickerInput, DatePickerNext, DatePickerPrevious, DatePickerRoot, DatePickerTrigger } from '@sectile/vue/date-picker';
import { DateRangePickerCell, DateRangePickerContent, DateRangePickerEndInput, DateRangePickerGrid, DateRangePickerRoot, DateRangePickerStartInput, DateRangePickerTrigger } from '@sectile/vue/date-range-picker';
import { DateTimePickerCell, DateTimePickerContent, DateTimePickerGrid, DateTimePickerInput, DateTimePickerNext, DateTimePickerPrevious, DateTimePickerRoot, DateTimePickerTimeInput, DateTimePickerTrigger } from '@sectile/vue/date-time-picker';
import { DateTimeRangePickerCell, DateTimeRangePickerContent, DateTimeRangePickerEndInput, DateTimeRangePickerEndTimeInput, DateTimeRangePickerGrid, DateTimeRangePickerNext, DateTimeRangePickerPrevious, DateTimeRangePickerRoot, DateTimeRangePickerStartInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerTrigger } from '@sectile/vue/date-time-range-picker';
import { QuantityFieldInput, QuantityFieldRoot, QuantityFieldUnitSelect, QuantityFieldValue, createStandardQuantityPolicies } from '@sectile/vue/quantity-field';
import { DialogClose, DialogContent, DialogDescription, DialogRoot, DialogTitle, DialogTrigger } from '@sectile/vue/dialog';
import { AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from '@sectile/vue/alert-dialog';
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '@sectile/vue/tooltip';
import { MultiThumbSliderRange, MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack } from '@sectile/vue/multi-thumb-slider';
import { MenuItem, MenuRoot, MenuSeparator, MenuSubContent } from '@sectile/vue/menu';
import { MenubarContent, MenubarItem, MenubarRoot, MenubarSeparator } from '@sectile/vue/menubar';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem as MenuButtonItem } from '@sectile/vue/menu-button';
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot, NavigationMenuTrigger } from '@sectile/vue/navigation-menu';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPause, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack } from '@sectile/vue/carousel';
import { FeedItem, FeedLoadEarlier, FeedLoadNewer, FeedRoot } from '@sectile/vue/feed';
import { CalendarCell, CalendarRoot } from '@sectile/vue/calendar';
import { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } from '@sectile/vue/combobox';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '@sectile/vue/tree-view';
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridRoot, TreeGridRow } from '@sectile/vue/tree-grid';
import { catalogCode } from '../catalog-code.js';
import DemoCard from './DemoCard.vue';

const props = defineProps<{
  readonly component: string;
  readonly title: string;
  readonly description: string;
  readonly variant: 'default' | 'alternate' | 'constrained';
}>();
const items = ['alpha', 'beta', 'stable'];
const menuItems = [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }, { id: 'open', parentID: 'file' }, { id: 'help', parentID: null }];
const fullCalendarRows = [
  ['2026-07-27', '2026-07-28', '2026-07-29', '2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02'],
  ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09'],
  ['2026-08-10', '2026-08-11', '2026-08-12', '2026-08-13', '2026-08-14', '2026-08-15', '2026-08-16'],
  ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22', '2026-08-23'],
  ['2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30'],
  ['2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05', '2026-09-06'],
];
const compactCalendarRows = [fullCalendarRows[3]!];
const date = Object.freeze({ year: 2026, month: 8, day: 22 });
const dateRange = Object.freeze({ start: date, end: Object.freeze({ year: 2026, month: 8, day: 25 }) });
const dateTime = Object.freeze({ date, time: Object.freeze({ hour: 9, minute: 30, second: 0, millisecond: 0 }) });
const dateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date: dateRange.end, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const sameDayDateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const treeNodes = [{ id: 'workspace', parentID: null }, { id: 'src', parentID: 'workspace' }, { id: 'tests', parentID: 'workspace' }];
const treeGridRows = [{ id: 'workspace', parentID: null, cells: ['workspace-name', 'workspace-status'] }, { id: 'src', parentID: 'workspace', cells: ['src-name', 'src-status'] }];
const cellValues = new Map([['workspace-name', 'Workspace'], ['workspace-status', 'Ready'], ['src-name', 'Source'], ['src-status', 'Active']]);
const quantityPolicies = createStandardQuantityPolicies('metre', 'metric');
const parts: Record<string, readonly string[]> = {
  'checkbox-group': ['CheckboxGroupRoot', 'CheckboxGroupItem', 'CheckboxGroupIndicator'], select: ['SelectRoot', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
  pagination: ['PaginationRoot', 'PaginationItem', 'PaginationPrevious', 'PaginationNext'], stepper: ['StepperRoot', 'StepperList', 'StepperStep', 'StepperContent'],
  rating: ['RatingRoot', 'RatingItem', 'RatingIndicator', 'RatingClear'], 'pin-input': ['PinInputRoot', 'PinInputInput'], 'tags-input': ['TagsInputRoot', 'TagsInputItem', 'TagsInputInput'],
  grid: ['GridRoot', 'GridRow', 'GridCell'], toolbar: ['ToolbarRoot', 'ToolbarItem', 'ToolbarSeparator'], 'window-splitter': ['WindowSplitterRoot', 'WindowSplitterPane', 'WindowSplitterHandle'],
  'date-picker': ['DatePickerRoot', 'DatePickerTrigger', 'DatePickerInput', 'DatePickerContent', 'DatePickerGrid', 'DatePickerCell'],
  'date-range-picker': ['DateRangePickerRoot', 'DateRangePickerStartInput', 'DateRangePickerEndInput', 'DateRangePickerContent'],
  'date-time-picker': ['DateTimePickerRoot', 'DateTimePickerInput', 'DateTimePickerTimeInput', 'DateTimePickerTrigger', 'DateTimePickerContent', 'DateTimePickerGrid', 'DateTimePickerCell'],
  'date-time-range-picker': ['DateTimeRangePickerRoot', 'DateTimeRangePickerStartInput', 'DateTimeRangePickerEndInput', 'DateTimeRangePickerTrigger', 'DateTimeRangePickerContent', 'DateTimeRangePickerGrid', 'DateTimeRangePickerCell'],
  'quantity-field': ['QuantityFieldRoot', 'QuantityFieldInput', 'QuantityFieldUnitSelect'], dialog: ['DialogRoot', 'DialogTrigger', 'DialogContent'], 'alert-dialog': ['AlertDialogRoot', 'AlertDialogTrigger', 'AlertDialogContent'],
  tooltip: ['TooltipRoot', 'TooltipTrigger', 'TooltipContent', 'TooltipArrow'], 'multi-thumb-slider': ['MultiThumbSliderRoot', 'MultiThumbSliderTrack', 'MultiThumbSliderThumb'], menu: ['MenuRoot', 'MenuItem', 'MenuSubContent'],
  menubar: ['MenubarRoot', 'MenubarItem', 'MenubarSubContent'], 'menu-button': ['MenuButtonRoot', 'MenuButtonTrigger', 'MenuButtonContent'], carousel: ['CarouselRoot', 'CarouselSlide', 'CarouselPrevious', 'CarouselNext'],
  'navigation-menu': ['NavigationMenuRoot', 'NavigationMenuList', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuLink'],
  feed: ['FeedRoot', 'FeedItem', 'FeedLoadEarlier', 'FeedLoadNewer'], calendar: ['CalendarRoot', 'CalendarCell'], combobox: ['ComboboxRoot', 'ComboboxInput', 'ComboboxContent', 'ComboboxItem'],
  'tree-view': ['TreeViewRoot', 'TreeViewItem', 'TreeViewDisclosure', 'TreeViewGroup'], 'tree-grid': ['TreeGridRoot', 'TreeGridRow', 'TreeGridCell', 'TreeGridEditor'],
};
const code = computed(() => catalogCode[props.component] ?? '');
const state = computed(() => ({ component: props.component, variant: props.variant, parts: parts[props.component] ?? [] }));
const isAlternate = computed(() => props.variant === 'alternate');
const isConstrained = computed(() => props.variant === 'constrained');
const selectedItems = computed(() => isAlternate.value ? ['alpha', 'stable'] : ['alpha']);
const visibleCalendarRows = computed(() => isAlternate.value ? compactCalendarRows : fullCalendarRows);
const sliderThumbs = computed(() => isAlternate.value ? ['minimum', 'middle', 'maximum'] : ['minimum', 'maximum']);
const sliderValues = computed(() => isAlternate.value ? [20, 50, 80] : [25, 75]);
</script>

<template>
  <DemoCard :title="title" :revision="0" :state="state" :entries="[]" interaction="enabled" :code="code">
    <div class="catalog-demo">
      <p class="catalog-description">{{ description }}</p>
      <CheckboxGroupRoot v-if="component === 'checkbox-group'" :default-value="selectedItems" name="channels" class="catalog-stack">
        <CheckboxGroupItem v-for="item in items" :key="item" :value="item" class="catalog-option">{{ item }} <CheckboxGroupIndicator>✓</CheckboxGroupIndicator></CheckboxGroupItem>
      </CheckboxGroupRoot>

      <SelectRoot v-else-if="component === 'select'" :items="items" :default-value="isAlternate ? 'stable' : 'alpha'" :default-open="isConstrained" class="catalog-popup-root">
        <SelectTrigger class="catalog-trigger"><SelectValue /></SelectTrigger>
        <SelectContent class="catalog-popup"><SelectItem v-for="item in items" :key="item" :value="item" class="catalog-option">{{ item }} <SelectItemIndicator>✓</SelectItemIndicator></SelectItem></SelectContent>
      </SelectRoot>

      <PaginationRoot v-else-if="component === 'pagination'" :total="240" :default-items-per-page="isAlternate ? 10 : 20" v-slot="{ items: pages }" class="catalog-pagination">
        <PaginationFirst v-if="!isConstrained" class="catalog-pagination-control" aria-label="First page">«</PaginationFirst><PaginationPrevious class="catalog-pagination-control" aria-label="Previous page">‹</PaginationPrevious>
        <template v-for="item in pages.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
          <span v-if="item.type === 'ellipsis'" class="catalog-pagination-ellipsis" aria-hidden="true">…</span>
          <PaginationItem v-else :item="item" class="catalog-pagination-page">{{ item.page }}</PaginationItem>
        </template>
        <PaginationNext class="catalog-pagination-control" aria-label="Next page">›</PaginationNext><PaginationLast v-if="!isConstrained" class="catalog-pagination-control" aria-label="Last page">»</PaginationLast>
      </PaginationRoot>

      <StepperRoot v-else-if="component === 'stepper'" :items="items" :default-value="isAlternate ? 'stable' : 'alpha'" class="catalog-stack">
        <StepperList class="catalog-inline"><StepperStep v-for="item in items" :key="item" :value="item">{{ item }}</StepperStep></StepperList>
        <StepperContent v-for="item in items" :key="item" :value="item" class="catalog-panel">Step: {{ item }}</StepperContent>
      </StepperRoot>

      <RatingRoot v-else-if="component === 'rating'" :items="['1', '2', '3', '4', '5']" :default-value="isAlternate ? '4' : '3'" :clearable="!isConstrained" :readonly="isConstrained" class="catalog-inline">
        <RatingItem v-for="value in ['1', '2', '3', '4', '5']" :key="value" :value="value" class="catalog-icon-button">★<RatingIndicator /></RatingItem><RatingClear>Clear</RatingClear>
      </RatingRoot>

      <PinInputRoot v-else-if="component === 'pin-input'" :length="isAlternate ? 8 : 6" :default-value="isAlternate ? '8472' : '12'" class="catalog-inline">
        <PinInputInput v-for="index in (isAlternate ? 8 : 6)" :key="index" :index="index - 1" class="catalog-pin" />
      </PinInputRoot>

      <TagsInputRoot v-else-if="component === 'tags-input'" :default-value="isAlternate ? ['Vue', 'DOM', 'Accessibility'] : ['Vue', 'DOM']" :max-tags="isConstrained ? 3 : undefined" class="catalog-inline" v-slot="{ value }">
        <TagsInputItem v-for="(_, index) in value" :key="index" :index="index" class="catalog-chip"><TagsInputItemText /><TagsInputItemDelete>×</TagsInputItemDelete></TagsInputItem>
        <TagsInputInput class="catalog-input" placeholder="Add tag" /><TagsInputClear>Clear</TagsInputClear>
      </TagsInputRoot>

      <GridRoot v-else-if="component === 'grid'" :rows="isAlternate ? [['Production', 'Ready', 'v0.2'], ['Preview', 'Pending', 'next']] : [['Core', 'Ready'], ['Vue', 'Active']]" class="catalog-grid">
        <GridRow v-for="row in (isAlternate ? [['Production', 'Ready', 'v0.2'], ['Preview', 'Pending', 'next']] : [['Core', 'Ready'], ['Vue', 'Active']])" :key="row[0]" class="catalog-grid-row"><GridCell v-for="cell in row" :key="cell" :value="cell" class="catalog-grid-cell">{{ cell }}</GridCell></GridRow>
      </GridRoot>

      <ToolbarRoot v-else-if="component === 'toolbar'" :items="items" label="Formatting" class="catalog-inline">
        <ToolbarItem value="alpha">Bold</ToolbarItem><ToolbarSeparator /><ToolbarItem value="beta">Italic</ToolbarItem><ToolbarItem value="stable">Link</ToolbarItem>
      </ToolbarRoot>

      <WindowSplitterRoot v-else-if="component === 'window-splitter'" :default-value="isAlternate ? 68 : 42" class="catalog-splitter">
        <WindowSplitterPane side="before" class="catalog-pane">Navigator</WindowSplitterPane><WindowSplitterHandle class="catalog-handle" /><WindowSplitterPane side="after" class="catalog-pane">Editor</WindowSplitterPane>
      </WindowSplitterRoot>

      <DatePickerRoot v-else-if="component === 'date-picker'" :default-value="isAlternate ? dateRange.end : date" :default-open="!isConstrained" v-slot="{ month }" class="catalog-stack">
        <div class="catalog-inline"><DatePickerInput class="catalog-input" /><DatePickerTrigger>Calendar</DatePickerTrigger></div>
        <DatePickerContent class="catalog-popup"><div class="catalog-inline"><DatePickerPrevious>‹</DatePickerPrevious><DatePickerNext>›</DatePickerNext></div><DatePickerGrid class="catalog-calendar"><DatePickerCell v-for="day in month.flat()" :key="`${day.year}-${day.month}-${day.day}`" :value="day">{{ day.day }}</DatePickerCell></DatePickerGrid></DatePickerContent>
      </DatePickerRoot>

      <DateRangePickerRoot v-else-if="component === 'date-range-picker'" :default-value="dateRange" :default-open="true" v-slot="{ month }" class="catalog-stack">
        <div class="catalog-inline"><DateRangePickerStartInput class="catalog-input" /><DateRangePickerEndInput class="catalog-input" /><DateRangePickerTrigger>Calendar</DateRangePickerTrigger></div>
        <DateRangePickerContent><DateRangePickerGrid class="catalog-calendar"><DateRangePickerCell v-for="day in month.flat()" :key="`${day.year}-${day.month}-${day.day}`" :value="day">{{ day.day }}</DateRangePickerCell></DateRangePickerGrid></DateRangePickerContent>
      </DateRangePickerRoot>

      <DateTimePickerRoot v-else-if="component === 'date-time-picker'" :default-value="dateTime" v-slot="{ month }" class="catalog-stack">
        <div class="catalog-inline"><DateTimePickerInput class="catalog-input" /><DateTimePickerTimeInput class="catalog-input" /><DateTimePickerTrigger>Calendar</DateTimePickerTrigger></div>
        <DateTimePickerContent class="catalog-popup"><div class="catalog-inline"><DateTimePickerPrevious>‹</DateTimePickerPrevious><DateTimePickerNext>›</DateTimePickerNext></div><DateTimePickerGrid class="catalog-calendar"><DateTimePickerCell v-for="day in month.flat()" :key="`${day.year}-${day.month}-${day.day}`" :value="day">{{ day.day }}</DateTimePickerCell></DateTimePickerGrid></DateTimePickerContent>
      </DateTimePickerRoot>
      <DateTimeRangePickerRoot v-else-if="component === 'date-time-range-picker'" :default-value="isAlternate ? sameDayDateTimeRange : dateTimeRange" v-slot="{ month }" class="catalog-stack">
        <div class="catalog-inline"><DateTimeRangePickerStartInput class="catalog-input" /><DateTimeRangePickerStartTimeInput class="catalog-input" /></div>
        <div class="catalog-inline"><DateTimeRangePickerEndInput class="catalog-input" /><DateTimeRangePickerEndTimeInput class="catalog-input" /><DateTimeRangePickerTrigger>Calendar</DateTimeRangePickerTrigger></div>
        <DateTimeRangePickerContent class="catalog-popup"><div class="catalog-inline"><DateTimeRangePickerPrevious>‹</DateTimeRangePickerPrevious><DateTimeRangePickerNext>›</DateTimeRangePickerNext></div><DateTimeRangePickerGrid class="catalog-calendar"><DateTimeRangePickerCell v-for="day in month.flat()" :key="`${day.year}-${day.month}-${day.day}`" :value="day">{{ day.day }}</DateTimeRangePickerCell></DateTimeRangePickerGrid></DateTimeRangePickerContent>
      </DateTimeRangePickerRoot>

      <QuantityFieldRoot v-else-if="component === 'quantity-field'" :policies="quantityPolicies" :default-value="{ value: isAlternate ? '2.5' : '1.25', unit: 'metre' }" :default-display-unit="isAlternate ? 'metre' : 'centimetre'" class="catalog-inline"><QuantityFieldInput class="catalog-input" /><QuantityFieldUnitSelect class="catalog-select" /><QuantityFieldValue /></QuantityFieldRoot>

      <DialogRoot v-else-if="component === 'dialog'" :default-open="isAlternate"><DialogTrigger>Open details</DialogTrigger><DialogContent class="catalog-dialog"><DialogTitle>Deployment</DialogTitle><DialogDescription>Review the release before continuing.</DialogDescription><DialogClose>Close</DialogClose></DialogContent></DialogRoot>
      <AlertDialogRoot v-else-if="component === 'alert-dialog'" :default-open="isAlternate"><AlertDialogTrigger>Delete project</AlertDialogTrigger><AlertDialogContent class="catalog-dialog"><AlertDialogTitle>Delete project?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription><AlertDialogClose>Cancel</AlertDialogClose></AlertDialogContent></AlertDialogRoot>
      <TooltipRoot v-else-if="component === 'tooltip'" :default-open="isAlternate" :side="isConstrained ? 'right' : 'top'"><TooltipTrigger>Keyboard shortcut</TooltipTrigger><TooltipContent class="catalog-tooltip"><TooltipArrow class="catalog-tooltip-arrow" />Open commands with ⌘K</TooltipContent></TooltipRoot>

      <MultiThumbSliderRoot v-else-if="component === 'multi-thumb-slider'" :thumbs="sliderThumbs" :default-value="sliderValues" class="catalog-slider"><MultiThumbSliderTrack class="catalog-slider-track"><MultiThumbSliderRange class="catalog-slider-range" /><MultiThumbSliderThumb v-for="thumb in sliderThumbs" :key="thumb" :value="thumb" :aria-label="thumb" class="catalog-slider-thumb" /></MultiThumbSliderTrack></MultiThumbSliderRoot>

      <MenuRoot v-else-if="component === 'menu'" :items="menuItems" class="catalog-menu"><MenuItem value="file">File ›</MenuItem><MenuSubContent for="file" class="catalog-submenu"><MenuItem value="new">New</MenuItem><MenuItem value="open">Open</MenuItem></MenuSubContent><MenuSeparator /><MenuItem value="help">Help</MenuItem></MenuRoot>
      <MenubarRoot v-else-if="component === 'menubar'" :items="menuItems" class="catalog-menubar"><MenubarItem value="file">File</MenubarItem><MenubarContent for="file" class="catalog-submenu"><MenubarItem value="new">New</MenubarItem><MenubarSeparator /><MenubarItem value="open">Open</MenubarItem></MenubarContent><MenubarItem value="help">Help</MenubarItem></MenubarRoot>
      <MenuButtonRoot v-else-if="component === 'menu-button'" :items="menuItems" :default-open="isAlternate"><MenuButtonTrigger>Actions</MenuButtonTrigger><MenuButtonContent class="catalog-popup"><MenuButtonItem value="file">File</MenuButtonItem><MenuButtonItem value="help">Help</MenuButtonItem></MenuButtonContent></MenuButtonRoot>
      <NavigationMenuRoot v-else-if="component === 'navigation-menu'" :items="menuItems" label="Primary" class="catalog-navigation-menu">
        <NavigationMenuList class="catalog-navigation-list">
          <NavigationMenuItem><NavigationMenuTrigger value="file" as="button">Products</NavigationMenuTrigger><NavigationMenuContent for="file" class="catalog-submenu"><NavigationMenuLink value="new" as="a" href="#new">New releases</NavigationMenuLink><NavigationMenuLink value="open" as="a" href="#open">Open source</NavigationMenuLink></NavigationMenuContent></NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink value="help" as="a" href="#docs">Documentation</NavigationMenuLink></NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenuRoot>

      <CarouselRoot v-else-if="component === 'carousel'" :slides="items" :default-value="isAlternate ? 'beta' : 'alpha'" :wrap="!isConstrained" class="catalog-carousel"><CarouselTrack><CarouselSlide v-for="item in items" :key="item" :value="item" class="catalog-slide">Release {{ item }}</CarouselSlide></CarouselTrack><div class="catalog-inline"><CarouselPrevious>‹</CarouselPrevious><CarouselNext>›</CarouselNext><CarouselPause v-if="isConstrained">Pause</CarouselPause></div><CarouselIndicatorGroup v-if="isAlternate" class="catalog-inline"><CarouselIndicator v-for="item in items" :key="item" :value="item" :aria-label="`Go to ${item}`">{{ items.indexOf(item) + 1 }}</CarouselIndicator></CarouselIndicatorGroup></CarouselRoot>

      <FeedRoot v-else-if="component === 'feed'" :items="isAlternate ? items.slice(0, 2) : items" class="catalog-feed"><FeedLoadEarlier>Load earlier</FeedLoadEarlier><div class="catalog-feed-list"><FeedItem v-for="item in (isAlternate ? items.slice(0, 2) : items)" :key="item" :value="item" class="catalog-feed-item"><strong>{{ item === 'alpha' ? 'Core published' : item === 'beta' ? 'Vue adapter verified' : 'Release tagged' }}</strong><small>{{ item === 'alpha' ? 'Package registry' : item === 'beta' ? 'Cross-host tests' : 'GitHub release' }}</small></FeedItem></div><FeedLoadNewer>Load newer</FeedLoadNewer></FeedRoot>
      <CalendarRoot v-else-if="component === 'calendar'" :rows="visibleCalendarRows" default-value="2026-08-22" class="catalog-calendar"><CalendarCell v-for="day in visibleCalendarRows.flat()" :key="day" :value="day">{{ day.slice(-2) }}</CalendarCell></CalendarRoot>

      <ComboboxRoot v-else-if="component === 'combobox'" :items="items.map(id => ({ id, label: id }))" :default-input-value="isAlternate ? 'st' : 'a'" :default-open="!isConstrained" class="catalog-stack"><ComboboxInput class="catalog-input" aria-label="Search release channels" /><ComboboxContent class="catalog-popup"><ComboboxItem v-for="item in items" :key="item" :value="item" class="catalog-option">{{ item }}</ComboboxItem><ComboboxEmpty>No matching channel</ComboboxEmpty></ComboboxContent></ComboboxRoot>

      <TreeViewRoot v-else-if="component === 'tree-view'" :nodes="treeNodes" :default-expanded-value="isAlternate ? [] : ['workspace']" class="catalog-tree" v-slot="{ expandedValue }">
        <TreeViewItem value="workspace" class="catalog-tree-item">
          <TreeViewDisclosure v-slot="{ expanded }" for="workspace" class="catalog-tree-disclosure" aria-label="Toggle Workspace">
            <ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" />
          </TreeViewDisclosure>
          <span>Workspace</span>
        </TreeViewItem>
        <TreeViewGroup v-if="expandedValue.includes('workspace')">
          <TreeViewItem value="src" class="catalog-tree-item">Source</TreeViewItem>
          <TreeViewItem value="tests" class="catalog-tree-item">Tests</TreeViewItem>
        </TreeViewGroup>
      </TreeViewRoot>

      <TreeGridRoot v-else-if="component === 'tree-grid'" :rows="treeGridRows" :get-cell-value="id => cellValues.get(id) ?? ''" :set-cell-value="(id, value) => cellValues.set(id, value)" :default-expanded-value="isAlternate ? [] : ['workspace']" class="catalog-tree-grid" v-slot="{ expandedValue }">
        <TreeGridRow value="workspace" :row-index="1" :expandable="true" class="catalog-grid-row">
          <TreeGridCell value="workspace-name" :column-index="1" class="catalog-grid-cell catalog-tree-grid-name">
            <TreeGridDisclosure v-slot="{ expanded }" for="workspace" class="catalog-tree-disclosure" aria-label="Toggle Workspace">
              <ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" />
            </TreeGridDisclosure>
            <span>Workspace</span>
            <TreeGridEditor for="workspace-name" label="Workspace name" />
          </TreeGridCell>
          <TreeGridCell value="workspace-status" :column-index="2" class="catalog-grid-cell">Ready</TreeGridCell>
        </TreeGridRow>
        <TreeGridRow v-if="expandedValue.includes('workspace')" value="src" :row-index="2" :level="2" class="catalog-grid-row">
          <TreeGridCell value="src-name" :column-index="1" class="catalog-grid-cell catalog-tree-grid-name catalog-tree-grid-child">
            <span>Source</span>
            <TreeGridEditor for="src-name" label="Source name" />
          </TreeGridCell>
          <TreeGridCell value="src-status" :column-index="2" class="catalog-grid-cell">Active</TreeGridCell>
        </TreeGridRow>
      </TreeGridRoot>
    </div>
  </DemoCard>
</template>
