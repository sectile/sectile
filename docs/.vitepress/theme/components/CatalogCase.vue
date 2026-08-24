<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileCode2, FilePlus2, Folder, FolderOpen,
  FolderPlus, GitBranch, PackageCheck, Pause, Play, Share2, Star, Upload,
} from '@lucide/vue';
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
import { DatePickerContent, DatePickerInput, DatePickerRoot, DatePickerTrigger } from '@sectile/vue/date-picker';
import { DateRangePickerContent, DateRangePickerEndInput, DateRangePickerRoot, DateRangePickerStartInput, DateRangePickerTrigger } from '@sectile/vue/date-range-picker';
import { DateTimePickerContent, DateTimePickerDateInput, DateTimePickerRoot, DateTimePickerTimeInput, DateTimePickerTrigger, type DateTimeValue } from '@sectile/vue/date-time-picker';
import { DateTimeRangePickerContent, DateTimeRangePickerEndDateInput, DateTimeRangePickerEndTimeInput, DateTimeRangePickerRoot, DateTimeRangePickerStartDateInput, DateTimeRangePickerStartTimeInput, DateTimeRangePickerTrigger } from '@sectile/vue/date-time-range-picker';
import { QuantityFieldInput, QuantityFieldRoot, QuantityFieldUnitSelect, QuantityFieldValue, createStandardQuantityPolicies } from '@sectile/vue/quantity-field';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogRoot, DialogTitle, DialogTrigger } from '@sectile/vue/dialog';
import { AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from '@sectile/vue/alert-dialog';
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '@sectile/vue/tooltip';
import { MultiThumbSliderRange, MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack } from '@sectile/vue/multi-thumb-slider';
import { MenuItem, MenuRoot, MenuSeparator, MenuSubContent } from '@sectile/vue/menu';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem as MenuButtonItem, MenuSeparator as MenuButtonSeparator, MenuSubContent as MenuButtonSubContent } from '@sectile/vue/menu-button';
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot, NavigationMenuTrigger, NavigationMenuViewport } from '@sectile/vue/navigation-menu';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPause, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack } from '@sectile/vue/carousel';
import { FeedItem, FeedLoadEarlier, FeedLoadNewer, FeedRoot } from '@sectile/vue/feed';
import { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } from '@sectile/vue/combobox';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '@sectile/vue/tree-view';
import { TreeGridCell, TreeGridDisclosure, TreeGridEditor, TreeGridRoot, TreeGridRow } from '@sectile/vue/tree-grid';
import { catalogCodeFor } from '../catalog-code.js';
import { multiThumbSliderExampleState } from '../catalog-example-state.js';
import CalendarExample from './CalendarExample.vue';
import DemoCard from './DemoCard.vue';
import MenubarExample from './MenubarExample.vue';
import PickerCalendarDemo from './PickerCalendarDemo.vue';

const props = defineProps<{
  readonly component: string;
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
}>();
const releaseChannels = Object.freeze([
  { id: 'stable', label: 'Stable', detail: 'Production-ready updates' },
  { id: 'preview', label: 'Preview', detail: 'Test features before release' },
  { id: 'nightly', label: 'Nightly', detail: 'Latest changes every day' },
]);
const releaseChannelIDs = releaseChannels.map(({ id }) => id);
const environments = Object.freeze([
  { id: 'production', label: 'Production', detail: 'customer.app' },
  { id: 'staging', label: 'Staging', detail: 'staging.customer.app' },
  { id: 'development', label: 'Development', detail: 'Local workspace' },
]);
const environmentIDs = environments.map(({ id }) => id);
const environmentLabel = (id: string): string => environments.find((item) => item.id === id)?.label ?? id;
const checkoutSteps = Object.freeze([
  { id: 'account', label: 'Account', detail: 'Contact and sign-in details' },
  { id: 'delivery', label: 'Delivery', detail: 'Address and shipping method' },
  { id: 'payment', label: 'Payment', detail: 'Secure payment information' },
  { id: 'review', label: 'Review', detail: 'Confirm and place the order' },
]);
const checkoutStepIDs = checkoutSteps.map(({ id }) => id);
const carouselSlides = Object.freeze([
  { id: 'tokens', label: 'Design tokens', detail: 'One source of truth for color, type, and spacing.', meta: 'Foundation' },
  { id: 'components', label: 'Accessible components', detail: 'Keyboard-ready building blocks for product teams.', meta: 'Interface' },
  { id: 'adapters', label: 'Every runtime', detail: 'Keep behavior aligned across DOM and terminal hosts.', meta: 'Platform' },
]);
const carouselSlideIDs = carouselSlides.map(({ id }) => id);
const carouselAutoplayDelay = 3000;
const feedEvents = Object.freeze([
  { id: 'deploy', title: 'Production deployment started', detail: 'Release workflow · Just now', status: 'Running' },
  { id: 'build', title: 'Production build completed', detail: 'Web app · 2 minutes ago', status: 'Passed' },
  { id: 'review', title: 'Pull request approved', detail: 'Mina Kim · 18 minutes ago', status: 'Ready' },
  { id: 'release', title: 'Version 0.2.0 published', detail: 'Package registry · 1 hour ago', status: 'Live' },
  { id: 'audit', title: 'Accessibility audit completed', detail: 'Documentation · 3 hours ago', status: 'Passed' },
]);
const feedEventIDs = feedEvents.map(({ id }) => id);
const toolbarItems = ['bold', 'italic', 'link'];
const menuItems = [{ id: 'file', parentID: null }, { id: 'new', parentID: 'file' }, { id: 'open', parentID: 'file' }, { id: 'help', parentID: null }];
const menuButtonItems = computed(() => isScenario('nested')
  ? [
      { id: 'download', parentID: null },
      { id: 'share', parentID: null },
      { id: 'export', parentID: null },
      { id: 'pdf', parentID: 'export' },
      { id: 'markdown', parentID: 'export' },
      { id: 'csv', parentID: 'export' },
    ]
  : [
      { id: 'new-file', parentID: null },
      { id: 'new-folder', parentID: null },
      { id: 'import', parentID: null },
    ]);
const date = Object.freeze({ year: 2026, month: 8, day: 22 });
const dateRange = Object.freeze({ start: date, end: Object.freeze({ year: 2026, month: 8, day: 25 }) });
const dateTime = Object.freeze({ date, time: Object.freeze({ hour: 9, minute: 30, second: 0, millisecond: 0 }) });
const morningDateTime = Object.freeze({ date: dateRange.end, time: Object.freeze({ hour: 7, minute: 45, second: 0, millisecond: 0 }) });
const controlledDateTime = ref<DateTimeValue | null>(Object.freeze({ date: Object.freeze({ year: 2026, month: 9, day: 3 }), time: Object.freeze({ hour: 14, minute: 15, second: 0, millisecond: 0 }) }));
const dateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date: dateRange.end, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const sameDayDateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const treeNodes = [
  { id: 'sectile', parentID: null },
  { id: 'src', parentID: 'sectile' },
  { id: 'components', parentID: 'src' },
  { id: 'tokens', parentID: 'src' },
  { id: 'tests', parentID: 'sectile' },
];
const treeGridRows = [
  { id: 'sectile', parentID: null, cells: ['sectile-name', 'sectile-branch', 'sectile-status'] },
  { id: 'src', parentID: 'sectile', cells: ['src-name', 'src-branch', 'src-status'] },
  { id: 'tests', parentID: 'sectile', cells: ['tests-name', 'tests-branch', 'tests-status'] },
];
const cellValues = new Map([
  ['sectile-name', 'sectile'], ['sectile-branch', 'main'], ['sectile-status', 'Healthy'],
  ['src-name', 'src'], ['src-branch', '12 files'], ['src-status', 'Modified'],
  ['tests-name', 'tests'], ['tests-branch', '38 checks'], ['tests-status', 'Passing'],
]);
const quantityPolicies = createStandardQuantityPolicies('metre', 'metric');
const parts: Record<string, readonly string[]> = {
  'checkbox-group': ['CheckboxGroupRoot', 'CheckboxGroupItem', 'CheckboxGroupIndicator'], select: ['SelectRoot', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
  pagination: ['PaginationRoot', 'PaginationItem', 'PaginationPrevious', 'PaginationNext'], stepper: ['StepperRoot', 'StepperList', 'StepperStep', 'StepperContent'],
  rating: ['RatingRoot', 'RatingItem', 'RatingIndicator', 'RatingClear'], 'pin-input': ['PinInputRoot', 'PinInputInput'], 'tags-input': ['TagsInputRoot', 'TagsInputItem', 'TagsInputInput'],
  grid: ['GridRoot', 'GridRow', 'GridCell'], toolbar: ['ToolbarRoot', 'ToolbarItem', 'ToolbarSeparator'], 'window-splitter': ['WindowSplitterRoot', 'WindowSplitterPane', 'WindowSplitterHandle'],
  'date-picker': ['DatePickerRoot', 'DatePickerTrigger', 'DatePickerInput', 'DatePickerContent', 'DatePickerPreviousWeek', 'DatePickerPreviousMonth', 'DatePickerPreviousYear', 'DatePickerNextWeek', 'DatePickerNextMonth', 'DatePickerNextYear', 'DatePickerWeekViewTrigger', 'DatePickerMonthViewTrigger', 'DatePickerYearViewTrigger', 'DatePickerGrid', 'DatePickerCell', 'DatePickerMonthCell'],
  'date-range-picker': ['DateRangePickerRoot', 'DateRangePickerStartInput', 'DateRangePickerEndInput', 'DateRangePickerTrigger', 'DateRangePickerContent', 'DateRangePickerPreviousWeek', 'DateRangePickerPreviousMonth', 'DateRangePickerPreviousYear', 'DateRangePickerNextWeek', 'DateRangePickerNextMonth', 'DateRangePickerNextYear', 'DateRangePickerWeekViewTrigger', 'DateRangePickerMonthViewTrigger', 'DateRangePickerYearViewTrigger', 'DateRangePickerGrid', 'DateRangePickerCell', 'DateRangePickerMonthCell'],
  'date-time-picker': ['DateTimePickerRoot', 'DateTimePickerDateInput', 'DateTimePickerTimeInput', 'DateTimePickerTrigger', 'DateTimePickerContent', 'DateTimePickerPreviousWeek', 'DateTimePickerPreviousMonth', 'DateTimePickerPreviousYear', 'DateTimePickerNextWeek', 'DateTimePickerNextMonth', 'DateTimePickerNextYear', 'DateTimePickerWeekViewTrigger', 'DateTimePickerMonthViewTrigger', 'DateTimePickerYearViewTrigger', 'DateTimePickerGrid', 'DateTimePickerCell', 'DateTimePickerMonthCell'],
  'date-time-range-picker': ['DateTimeRangePickerRoot', 'DateTimeRangePickerStartDateInput', 'DateTimeRangePickerStartTimeInput', 'DateTimeRangePickerEndDateInput', 'DateTimeRangePickerEndTimeInput', 'DateTimeRangePickerTrigger', 'DateTimeRangePickerContent', 'DateTimeRangePickerPreviousWeek', 'DateTimeRangePickerPreviousMonth', 'DateTimeRangePickerPreviousYear', 'DateTimeRangePickerNextWeek', 'DateTimeRangePickerNextMonth', 'DateTimeRangePickerNextYear', 'DateTimeRangePickerWeekViewTrigger', 'DateTimeRangePickerMonthViewTrigger', 'DateTimeRangePickerYearViewTrigger', 'DateTimeRangePickerGrid', 'DateTimeRangePickerCell', 'DateTimeRangePickerMonthCell'],
  'quantity-field': ['QuantityFieldRoot', 'QuantityFieldInput', 'QuantityFieldUnitSelect'], dialog: ['DialogRoot', 'DialogTrigger', 'DialogContent'], 'alert-dialog': ['AlertDialogRoot', 'AlertDialogTrigger', 'AlertDialogContent'],
  tooltip: ['TooltipRoot', 'TooltipTrigger', 'TooltipContent', 'TooltipArrow'], 'multi-thumb-slider': ['MultiThumbSliderRoot', 'MultiThumbSliderTrack', 'MultiThumbSliderThumb'], menu: ['MenuRoot', 'MenuItem', 'MenuSubContent'],
  menubar: ['MenubarRoot', 'MenubarItem', 'MenubarContent', 'MenubarSeparator'], 'menu-button': ['MenuButtonRoot', 'MenuButtonTrigger', 'MenuButtonContent'], carousel: ['CarouselRoot', 'CarouselSlide', 'CarouselPrevious', 'CarouselNext'],
  'navigation-menu': ['NavigationMenuRoot', 'NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuViewport', 'NavigationMenuLink'],
  feed: ['FeedRoot', 'FeedItem', 'FeedLoadEarlier', 'FeedLoadNewer'], calendar: ['CalendarRoot', 'CalendarCell'], combobox: ['ComboboxRoot', 'ComboboxInput', 'ComboboxContent', 'ComboboxItem'],
  'tree-view': ['TreeViewRoot', 'TreeViewItem', 'TreeViewDisclosure', 'TreeViewGroup'], 'tree-grid': ['TreeGridRoot', 'TreeGridRow', 'TreeGridCell', 'TreeGridEditor'],
};
const code = computed(() => catalogCodeFor(props.component, props.scenario));
const state = computed(() => ({ component: props.component, scenario: props.scenario, parts: parts[props.component] ?? [] }));
const isScenario = (...values: readonly string[]) => values.includes(props.scenario);
const selectedItems = computed(() => isScenario('release-channels') ? ['stable', 'preview'] : ['stable']);
const sliderExample = computed(() => multiThumbSliderExampleState(props.scenario));
const gridRows = computed(() => isScenario('editable', 'controlled', 'disabled-wrap')
  ? [['Production', 'Ready', 'v0.2'], ['Preview', 'Pending', 'next']]
  : [['Core', 'Ready'], ['Vue', 'Active']]);
const checkoutValue = ref('delivery');
const actionStatus = ref('');
const feedWindow = ref<readonly string[]>(Object.freeze(feedEventIDs.slice(1, 4)));
const feedRevision = ref(0);
const feedStatus = ref('');
const feedItems = computed(() => feedWindow.value);
const visibleFeedEvents = computed(() => feedEvents.filter(({ id }) => feedWindow.value.includes(id)));
const canLoadEarlier = computed(() => !feedWindow.value.includes('audit'));
const canLoadNewer = computed(() => !feedWindow.value.includes('deploy'));
const treeExpanded = computed(() => isScenario('collapsed') ? [] : ['sectile', 'src']);
const treeSelection = computed(() => isScenario('multiple')
  ? ['components', 'tests']
  : isScenario('collapsed') ? ['sectile'] : ['components']);
const pickerDateTime = computed(() => isScenario('morning') ? morningDateTime : dateTime);
const dateTimePickerProps = computed(() => isScenario('controlled')
  ? { modelValue: controlledDateTime.value }
  : { defaultValue: pickerDateTime.value });
const updateControlledDateTime = (value: unknown): void => {
  if (isScenario('controlled')) controlledDateTime.value = value as DateTimeValue | null;
};
const nextCheckoutStep = (current: string): string | undefined => {
  const next = checkoutStepIDs[checkoutStepIDs.indexOf(current) + 1];
  if (next === undefined || (isScenario('gated-step') && ['payment', 'review'].includes(next))) return undefined;
  return next;
};
const checkoutActionLabel = (current: string): string => {
  const next = nextCheckoutStep(current);
  if (next !== undefined) return `Continue to ${checkoutSteps.find(({ id }) => id === next)?.label ?? next}`;
  return isScenario('gated-step') && current === 'delivery' ? 'Complete delivery to unlock Payment' : 'Checkout steps complete';
};
const advanceCheckout = (current: string): void => {
  const next = nextCheckoutStep(current);
  if (next !== undefined) checkoutValue.value = next;
};
const recordAction = (value: string): void => {
  const labels: Readonly<Record<string, string>> = Object.freeze({
    bold: 'Bold', italic: 'Italic', link: 'Link', file: 'File', new: 'New', open: 'Open', help: 'Help',
    'new-file': 'New file', 'new-folder': 'New folder', import: 'Import', download: 'Download', share: 'Share',
    export: 'Export', pdf: 'PDF', markdown: 'Markdown', csv: 'CSV',
  });
  actionStatus.value = `${labels[value] ?? value} action invoked`;
};
const loadFeedWindow = (direction: 'before' | 'after'): void => {
  if (direction === 'after' && canLoadNewer.value) {
    feedWindow.value = Object.freeze(['deploy', ...feedWindow.value]);
    feedStatus.value = '1 newer activity loaded';
  } else if (direction === 'before' && canLoadEarlier.value) {
    feedWindow.value = Object.freeze([...feedWindow.value, 'audit']);
    feedStatus.value = '1 earlier activity loaded';
  } else {
    feedStatus.value = direction === 'after' ? 'No newer activity available' : 'No earlier activity available';
    return;
  }
  feedRevision.value += 1;
};
</script>

<template>
  <DemoCard
    :title="title"
    :revision="0"
    :state="state"
    :entries="[]"
    interaction="enabled"
    :code="code"
    :class="{ 'temporal-picker-card': ['date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker'].includes(component) }"
  >
    <div class="catalog-demo">
      <p class="catalog-description">{{ description }}</p>
      <CheckboxGroupRoot v-if="component === 'checkbox-group'" :default-value="selectedItems" name="channels" class="catalog-stack catalog-choice-group">
        <CheckboxGroupItem v-for="item in releaseChannels" :key="item.id" :value="item.id" class="catalog-option catalog-choice-option">
          <span class="catalog-choice-marker"><CheckboxGroupIndicator><Check :size="15" :stroke-width="2.5" /></CheckboxGroupIndicator></span>
          <span class="catalog-option-copy"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span>
        </CheckboxGroupItem>
      </CheckboxGroupRoot>

      <div v-else-if="component === 'select'" class="catalog-field-shell">
        <span class="catalog-field-label">Deployment environment</span>
        <SelectRoot :items="environmentIDs" :text-value="environmentLabel" :disabled-items="isScenario('disabled-option') ? ['development'] : []" default-value="production" :default-open="isScenario('disabled-option')" label="Deployment environment" class="catalog-popup-root">
          <SelectTrigger class="catalog-trigger catalog-select-trigger"><SelectValue /><ChevronDown :size="17" aria-hidden="true" /></SelectTrigger>
          <SelectContent class="catalog-popup catalog-select-popup"><SelectItem v-for="item in environments" :key="item.id" :value="item.id" class="catalog-option catalog-select-option"><span class="catalog-option-copy"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span><SelectItemIndicator><Check :size="16" aria-hidden="true" /></SelectItemIndicator></SelectItem></SelectContent>
        </SelectRoot>
        <small class="catalog-field-help">Deployments inherit variables from the selected environment.</small>
      </div>

      <PaginationRoot v-else-if="component === 'pagination'" :total="isScenario('long-range') ? 2500 : 240" :default-items-per-page="isScenario('compact') ? 10 : 20" v-slot="{ items: pages }" class="catalog-pagination">
        <PaginationFirst v-if="!isScenario('compact', 'pages-only')" class="catalog-pagination-control" aria-label="First page">«</PaginationFirst><PaginationPrevious class="catalog-pagination-control" aria-label="Previous page">‹</PaginationPrevious>
        <template v-for="item in pages.filter(item => item.type !== 'control')" :key="JSON.stringify(item)">
          <span v-if="item.type === 'ellipsis'" class="catalog-pagination-ellipsis" aria-hidden="true">…</span>
          <PaginationItem v-else :item="item" class="catalog-pagination-page">{{ item.page }}</PaginationItem>
        </template>
        <PaginationNext class="catalog-pagination-control" aria-label="Next page">›</PaginationNext><PaginationLast v-if="!isScenario('compact', 'pages-only')" class="catalog-pagination-control" aria-label="Last page">»</PaginationLast>
      </PaginationRoot>

      <StepperRoot v-else-if="component === 'stepper'" v-model="checkoutValue" :items="checkoutStepIDs" :disabled-items="isScenario('gated-step') ? ['payment', 'review'] : []" class="catalog-stepper" v-slot="{ value }">
        <StepperList class="catalog-stepper-list"><StepperStep v-for="(step, index) in checkoutSteps" :key="step.id" :value="step.id" class="catalog-stepper-step" :class="{ 'is-complete': checkoutStepIDs.indexOf(value) > index }"><span class="catalog-stepper-index"><Check v-if="checkoutStepIDs.indexOf(value) > index" :size="15" :stroke-width="2.6" /><span v-else>{{ index + 1 }}</span></span><strong>{{ step.label }}</strong></StepperStep></StepperList>
        <StepperContent v-for="(step, index) in checkoutSteps" :key="step.id" :value="step.id" class="catalog-stepper-panel"><span class="catalog-stepper-kicker">Step {{ index + 1 }} of {{ checkoutSteps.length }}</span><strong>{{ step.label }}</strong><p>{{ step.detail }}</p><button type="button" :disabled="nextCheckoutStep(step.id) === undefined" @click="advanceCheckout(step.id)">{{ checkoutActionLabel(step.id) }}</button></StepperContent>
      </StepperRoot>

      <RatingRoot v-else-if="component === 'rating'" :items="['1', '2', '3', '4', '5']" :default-value="isScenario('required', 'controlled') ? '4' : '3'" :clearable="!isScenario('required')" class="catalog-rating" v-slot="{ value: ratingValue }">
        <RatingItem
          v-for="value in ['1', '2', '3', '4', '5']"
          :key="value"
          :value="value"
          class="catalog-rating-item"
          :class="{ 'catalog-rating-item--filled': Number(value) <= Number(ratingValue) }"
        >
          <Star class="catalog-rating-star" aria-hidden="true" :size="25" :stroke-width="2" />
          <RatingIndicator class="catalog-rating-indicator" />
        </RatingItem>
        <RatingClear class="catalog-rating-clear">Clear rating</RatingClear>
      </RatingRoot>

      <PinInputRoot v-else-if="component === 'pin-input'" :length="isScenario('prefilled') ? 8 : 6" :default-value="isScenario('prefilled') ? '8472' : '12'" class="catalog-inline">
        <PinInputInput v-for="index in (isScenario('prefilled') ? 8 : 6)" :key="index" :index="index - 1" class="catalog-pin" />
      </PinInputRoot>

      <TagsInputRoot v-else-if="component === 'tags-input'" :default-value="isScenario('limited', 'controlled') ? ['Vue', 'DOM', 'Accessibility'] : ['Vue', 'DOM']" :max-tags="isScenario('limited') ? 3 : undefined" class="catalog-inline" v-slot="{ value }">
        <TagsInputItem v-for="(_, index) in value" :key="index" :index="index" class="catalog-chip"><TagsInputItemText /><TagsInputItemDelete>×</TagsInputItemDelete></TagsInputItem>
        <TagsInputInput class="catalog-input" placeholder="Add tag" /><TagsInputClear>Clear</TagsInputClear>
      </TagsInputRoot>

      <GridRoot v-else-if="component === 'grid'" :rows="gridRows" :disabled-items="isScenario('disabled-wrap') ? ['Pending'] : []" :readonly="!isScenario('editable')" class="catalog-grid">
        <GridRow v-for="row in gridRows" :key="row.join(':')" class="catalog-grid-row"><GridCell v-for="cell in row" :key="cell" :value="cell" class="catalog-grid-cell">{{ cell }}</GridCell></GridRow>
      </GridRoot>

      <div v-else-if="component === 'toolbar'" class="catalog-action-demo"><ToolbarRoot :items="toolbarItems" :orientation="isScenario('vertical-disabled') ? 'vertical' : 'horizontal'" :disabled-items="isScenario('vertical-disabled') ? ['italic'] : []" label="Formatting" class="catalog-inline catalog-toolbar" @invoke="recordAction"><ToolbarItem value="bold"><strong>B</strong><span class="sr-only">Bold</span></ToolbarItem><ToolbarSeparator /><ToolbarItem value="italic"><em>I</em><span class="sr-only">Italic</span></ToolbarItem><ToolbarItem value="link">Link</ToolbarItem></ToolbarRoot><p class="catalog-action-status" role="status" aria-live="polite">{{ actionStatus }}</p></div>

      <WindowSplitterRoot v-else-if="component === 'window-splitter'" :default-value="isScenario('vertical') ? 68 : 42" :orientation="isScenario('vertical') ? 'vertical' : 'horizontal'" class="catalog-splitter">
        <WindowSplitterPane side="before" class="catalog-pane">Navigator</WindowSplitterPane><WindowSplitterHandle class="catalog-handle" /><WindowSplitterPane side="after" class="catalog-pane">Editor</WindowSplitterPane>
      </WindowSplitterRoot>

      <DatePickerRoot v-else-if="component === 'date-picker'" :default-value="isScenario('weekdays') ? dateRange.end : date" :default-open="true" :default-view="isScenario('weekdays') ? 'week' : 'month'" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
        <div class="catalog-inline"><DatePickerInput class="catalog-input" /><DatePickerTrigger>Calendar</DatePickerTrigger></div>
        <DatePickerContent class="catalog-popup catalog-picker-popup">
          <PickerCalendarDemo component="date-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" />
        </DatePickerContent>
      </DatePickerRoot>

      <DateRangePickerRoot v-else-if="component === 'date-range-picker'" :default-value="dateRange" :default-open="true" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
        <div class="catalog-inline"><DateRangePickerStartInput class="catalog-input" /><DateRangePickerEndInput class="catalog-input" /><DateRangePickerTrigger>Calendar</DateRangePickerTrigger></div>
        <DateRangePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-range-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateRangePickerContent>
      </DateRangePickerRoot>

      <DateTimePickerRoot v-else-if="component === 'date-time-picker'" v-bind="dateTimePickerProps" :default-open="isScenario('morning')" :default-view="isScenario('morning') ? 'week' : 'month'" @update:model-value="updateControlledDateTime" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
        <div class="catalog-range-fields"><label class="catalog-field"><span>Date</span><DateTimePickerDateInput class="catalog-input" /></label><label class="catalog-field"><span>Time</span><DateTimePickerTimeInput class="catalog-input" /></label><DateTimePickerTrigger>Calendar</DateTimePickerTrigger></div>
        <DateTimePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-time-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateTimePickerContent>
      </DateTimePickerRoot>
      <DateTimeRangePickerRoot v-else-if="component === 'date-time-range-picker'" :default-value="isScenario('office-hours') ? sameDayDateTimeRange : dateTimeRange" :default-view="isScenario('office-hours') ? 'week' : 'month'" v-slot="{ dates, months, view, viewMode }" class="catalog-stack">
        <div class="catalog-range-fields"><label class="catalog-endpoint"><span>Start</span><DateTimeRangePickerStartDateInput class="catalog-input" /><DateTimeRangePickerStartTimeInput class="catalog-input catalog-time-input" /></label><label class="catalog-endpoint"><span>End</span><DateTimeRangePickerEndDateInput class="catalog-input" /><DateTimeRangePickerEndTimeInput class="catalog-input catalog-time-input" /></label><DateTimeRangePickerTrigger>Calendar</DateTimeRangePickerTrigger></div>
        <DateTimeRangePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-time-range-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateTimeRangePickerContent>
      </DateTimeRangePickerRoot>

      <QuantityFieldRoot v-else-if="component === 'quantity-field'" :policies="quantityPolicies" :default-value="{ value: isScenario('calculator', 'controlled') ? '2.5' : '1.25', unit: 'metre' }" :default-display-unit="isScenario('length') ? 'centimetre' : 'metre'" class="catalog-inline"><QuantityFieldInput class="catalog-input" /><QuantityFieldUnitSelect class="catalog-select" /><QuantityFieldValue /></QuantityFieldRoot>

      <DialogRoot v-else-if="component === 'dialog'" :default-open="true" :modal="!isScenario('non-modal')">
        <DialogTrigger>Open details</DialogTrigger>
        <DialogOverlay v-if="!isScenario('non-modal')" class="catalog-dialog-overlay" />
        <DialogContent :class="['catalog-dialog', isScenario('non-modal') ? 'catalog-nonmodal-dialog' : 'catalog-modal-dialog']">
          <DialogTitle class="catalog-dialog-title">Deployment details</DialogTitle>
          <DialogDescription class="catalog-dialog-description">Review the release before continuing.</DialogDescription>
          <div class="catalog-dialog-actions"><DialogClose class="secondary">Close</DialogClose></div>
        </DialogContent>
      </DialogRoot>
      <AlertDialogRoot v-else-if="component === 'alert-dialog'">
        <AlertDialogTrigger>{{ isScenario('unsaved') ? 'Discard draft' : 'Delete project' }}</AlertDialogTrigger>
        <AlertDialogOverlay class="catalog-dialog-overlay" />
        <AlertDialogContent :class="['catalog-dialog', 'catalog-alert-dialog', isScenario('unsaved') ? 'catalog-alert-dialog--warning' : 'catalog-alert-dialog--danger']">
          <AlertDialogTitle class="catalog-dialog-title">{{ isScenario('unsaved') ? 'Discard unsaved changes?' : 'Delete project?' }}</AlertDialogTitle>
          <AlertDialogDescription class="catalog-dialog-description">
            {{ isScenario('unsaved') ? 'Your edits to Release 0.3 will be lost.' : 'This permanently removes the project and its deployment history.' }}
          </AlertDialogDescription>
          <div class="catalog-dialog-actions">
            <AlertDialogClose class="secondary">{{ isScenario('unsaved') ? 'Keep editing' : 'Cancel' }}</AlertDialogClose>
            <AlertDialogClose :class="isScenario('unsaved') ? 'catalog-warning-button' : 'catalog-danger-button'">{{ isScenario('unsaved') ? 'Discard changes' : 'Delete project' }}</AlertDialogClose>
          </div>
        </AlertDialogContent>
      </AlertDialogRoot>
      <TooltipRoot v-else-if="component === 'tooltip'" :default-open="isScenario('initially-open', 'controlled')" :side="isScenario('controlled') ? 'right' : 'top'"><TooltipTrigger>Keyboard shortcut</TooltipTrigger><TooltipContent class="catalog-tooltip"><TooltipArrow class="catalog-tooltip-arrow" />Open commands with ⌘K</TooltipContent></TooltipRoot>

      <MultiThumbSliderRoot v-else-if="component === 'multi-thumb-slider'" :thumbs="sliderExample.thumbs" :default-value="sliderExample.values" v-bind="sliderExample.policies === undefined ? {} : { policies: sliderExample.policies }" class="catalog-slider"><MultiThumbSliderTrack class="catalog-slider-track"><MultiThumbSliderRange class="catalog-slider-range" /><MultiThumbSliderThumb v-for="thumb in sliderExample.thumbs" :key="thumb" :value="thumb" :aria-label="thumb" class="catalog-slider-thumb" /></MultiThumbSliderTrack></MultiThumbSliderRoot>

      <div v-else-if="component === 'menu'" class="catalog-action-demo"><MenuRoot :items="menuItems" class="catalog-menu" @invoke="recordAction"><MenuItem value="file">File ›</MenuItem><MenuSubContent for="file" class="catalog-submenu"><MenuItem value="new">New</MenuItem><MenuItem value="open">Open</MenuItem></MenuSubContent><MenuSeparator /><MenuItem value="help">Help</MenuItem></MenuRoot><p class="catalog-action-status" role="status" aria-live="polite">{{ actionStatus }}</p></div>
      <MenubarExample v-else-if="component === 'menubar'" :scenario="scenario" />
      <div v-else-if="component === 'menu-button'" class="catalog-action-demo catalog-menu-button-demo">
        <MenuButtonRoot :items="menuButtonItems" :default-open="isScenario('nested')" @invoke="recordAction">
          <MenuButtonTrigger class="catalog-menu-button-trigger">
            <Share2 v-if="isScenario('nested')" :size="17" aria-hidden="true" />
            <FilePlus2 v-else :size="17" aria-hidden="true" />
            <span>{{ isScenario('nested') ? 'Export options' : 'Create' }}</span>
            <ChevronDown :size="15" aria-hidden="true" />
          </MenuButtonTrigger>
          <MenuButtonContent class="catalog-popup catalog-menu-button-popup">
            <template v-if="isScenario('nested')">
              <MenuButtonItem value="download" class="catalog-menu-button-item"><Download :size="17" aria-hidden="true" /><span>Download copy</span><kbd>⇧D</kbd></MenuButtonItem>
              <MenuButtonItem value="share" class="catalog-menu-button-item"><Share2 :size="17" aria-hidden="true" /><span>Share link</span><kbd>⌘L</kbd></MenuButtonItem>
              <MenuButtonSeparator class="catalog-menu-button-separator" />
              <MenuButtonItem value="export" class="catalog-menu-button-item"><FileCode2 :size="17" aria-hidden="true" /><span>Export as</span><ChevronRight :size="15" aria-hidden="true" /></MenuButtonItem>
              <MenuButtonSubContent for="export" class="catalog-popup catalog-menu-button-submenu">
                <MenuButtonItem value="pdf" class="catalog-menu-button-item"><span>PDF document</span><kbd>.pdf</kbd></MenuButtonItem>
                <MenuButtonItem value="markdown" class="catalog-menu-button-item"><span>Markdown</span><kbd>.md</kbd></MenuButtonItem>
                <MenuButtonItem value="csv" class="catalog-menu-button-item"><span>CSV data</span><kbd>.csv</kbd></MenuButtonItem>
              </MenuButtonSubContent>
            </template>
            <template v-else>
              <MenuButtonItem value="new-file" class="catalog-menu-button-item"><FilePlus2 :size="17" aria-hidden="true" /><span>New file</span><kbd>⌘N</kbd></MenuButtonItem>
              <MenuButtonItem value="new-folder" class="catalog-menu-button-item"><FolderPlus :size="17" aria-hidden="true" /><span>New folder</span><kbd>⇧⌘N</kbd></MenuButtonItem>
              <MenuButtonSeparator class="catalog-menu-button-separator" />
              <MenuButtonItem value="import" class="catalog-menu-button-item"><Upload :size="17" aria-hidden="true" /><span>Import…</span></MenuButtonItem>
            </template>
          </MenuButtonContent>
        </MenuButtonRoot>
        <p v-if="actionStatus" class="catalog-action-status" role="status" aria-live="polite">{{ actionStatus }}</p>
      </div>
      <NavigationMenuRoot v-else-if="component === 'navigation-menu'" :items="menuItems" :disabled="isScenario('disabled')" label="Primary" class="catalog-navigation-menu" v-slot="{ openPath }">
        <NavigationMenuList class="catalog-navigation-list">
          <NavigationMenuItem class="catalog-navigation-item">
            <NavigationMenuTrigger value="file" as="button" class="catalog-navigation-trigger">
              {{ isScenario('links') ? 'Resources' : 'Products' }} <ChevronDown :size="15" aria-hidden="true" />
            </NavigationMenuTrigger>
          </NavigationMenuItem>
          <NavigationMenuItem class="catalog-navigation-item">
            <NavigationMenuLink value="help" as="a" href="#docs" class="catalog-navigation-link">
              <FileCode2 :size="15" aria-hidden="true" /> {{ isScenario('links') ? 'GitHub' : 'Documentation' }}
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuViewport v-show="openPath.includes('file')" class="catalog-navigation-viewport">
          <NavigationMenuContent for="file" class="catalog-navigation-panel">
            <NavigationMenuLink value="new" as="a" href="#new" class="catalog-navigation-card">
              <PackageCheck :size="18" aria-hidden="true" />
              <span><strong>{{ isScenario('links') ? 'Guides' : 'New releases' }}</strong><small>{{ isScenario('links') ? 'Patterns for integrating Sectile' : 'What shipped in the latest version' }}</small></span>
            </NavigationMenuLink>
            <NavigationMenuLink value="open" as="a" href="#open" class="catalog-navigation-card">
              <GitBranch :size="18" aria-hidden="true" />
              <span><strong>{{ isScenario('links') ? 'API reference' : 'Open source' }}</strong><small>{{ isScenario('links') ? 'Props, events, parts, and types' : 'Browse packages and contribution guides' }}</small></span>
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuViewport>
      </NavigationMenuRoot>

      <CarouselRoot
        v-else-if="component === 'carousel'"
        :slides="carouselSlideIDs"
        default-value="tokens"
        :policies="isScenario('bounded') ? { wrap: false } : { wrap: true }"
        :autoplay="isScenario('paused') ? { delayMs: carouselAutoplayDelay, pauseOnHover: false, pauseOnFocus: false, stopOnInteraction: false } : false"
        :default-paused="isScenario('paused')"
        :style="{ '--catalog-carousel-duration': `${carouselAutoplayDelay}ms` }"
        class="catalog-carousel"
        v-slot="{ paused }"
      >
        <CarouselTrack class="catalog-carousel-track"><CarouselSlide v-for="slide in carouselSlides" :key="slide.id" :value="slide.id" class="catalog-slide"><span>{{ slide.meta }}</span><strong>{{ slide.label }}</strong><p>{{ slide.detail }}</p></CarouselSlide></CarouselTrack>
        <div class="catalog-carousel-controls"><div class="catalog-inline"><CarouselPrevious class="catalog-square-button" aria-label="Previous slide"><ChevronLeft :size="18" aria-hidden="true" /></CarouselPrevious><CarouselNext class="catalog-square-button" aria-label="Next slide"><ChevronRight :size="18" aria-hidden="true" /></CarouselNext><CarouselPause v-if="isScenario('paused')" class="catalog-square-button catalog-carousel-pause"><Play v-if="paused" :size="18" aria-hidden="true" /><Pause v-else :size="18" aria-hidden="true" /><span class="sr-only">{{ paused ? 'Resume autoplay' : 'Pause autoplay' }}</span></CarouselPause></div><CarouselIndicatorGroup class="catalog-carousel-indicators" :data-autoplay="isScenario('paused') ? (paused ? 'paused' : 'running') : undefined"><CarouselIndicator v-for="slide in carouselSlides" :key="slide.id" :value="slide.id" :aria-label="`Go to ${slide.label}`"><span v-if="isScenario('paused')" class="catalog-carousel-progress" aria-hidden="true" /><span class="sr-only">{{ slide.label }}</span></CarouselIndicator></CarouselIndicatorGroup></div>
      </CarouselRoot>

      <FeedRoot v-else-if="component === 'feed'" :items="feedItems" :revision="feedRevision" class="catalog-feed" label="Deployment activity" @request-window="loadFeedWindow"><FeedLoadEarlier v-if="isScenario('load-before') && canLoadEarlier" class="catalog-feed-control">Load earlier activity</FeedLoadEarlier><div class="catalog-feed-list"><FeedItem v-for="event in visibleFeedEvents" :key="event.id" :value="event.id" class="catalog-feed-item"><span class="catalog-feed-icon"><PackageCheck v-if="event.id === 'build'" :size="18" /><Check v-else-if="event.id === 'review'" :size="18" /><GitBranch v-else :size="18" /></span><span class="catalog-option-copy"><strong>{{ event.title }}</strong><small>{{ event.detail }}</small></span><span class="catalog-status">{{ event.status }}</span></FeedItem></div><FeedLoadNewer v-if="isScenario('load-after') && canLoadNewer" class="catalog-feed-control">Load newer activity</FeedLoadNewer><p v-if="feedStatus" class="catalog-feed-message" role="status" aria-live="polite">{{ feedStatus }}</p></FeedRoot>
      <CalendarExample v-else-if="component === 'calendar'" :scenario="scenario" />

      <div v-else-if="component === 'combobox'" class="catalog-field-shell"><span class="catalog-field-label">Add an environment</span><ComboboxRoot :items="environments" :default-input-value="isScenario('contains') ? 'age' : 'pro'" :default-open="!isScenario('ime')" class="catalog-stack"><ComboboxInput class="catalog-input catalog-search-input" aria-label="Search environments" placeholder="Search environments…" /><ComboboxContent class="catalog-popup catalog-combobox-popup"><ComboboxItem v-for="item in environments" :key="item.id" :value="item.id" class="catalog-option"><span class="catalog-option-copy"><strong>{{ item.label }}</strong><small>{{ item.detail }}</small></span></ComboboxItem><ComboboxEmpty class="catalog-empty">No environments match this search.</ComboboxEmpty></ComboboxContent></ComboboxRoot></div>

      <TreeViewRoot v-else-if="component === 'tree-view'" :nodes="treeNodes" :default-value="treeSelection" :default-expanded-value="treeExpanded" :disabled-items="isScenario('unavailable') ? ['tests'] : []" class="catalog-tree" v-slot="{ expandedValue }">
        <TreeViewItem value="sectile" class="catalog-tree-item catalog-tree-folder" v-slot="{ selected }">
          <TreeViewDisclosure v-slot="{ expanded }" for="sectile" class="catalog-tree-disclosure" aria-label="Toggle sectile project">
            <ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" />
          </TreeViewDisclosure>
          <FolderOpen v-if="expandedValue.includes('sectile')" :size="18" aria-hidden="true" /><Folder v-else :size="18" aria-hidden="true" /><span>sectile</span><small>Design system</small><Check v-if="selected" class="catalog-tree-selected-icon" :size="16" aria-hidden="true" />
        </TreeViewItem>
        <TreeViewGroup v-if="expandedValue.includes('sectile')">
          <TreeViewItem value="src" class="catalog-tree-item catalog-tree-folder" v-slot="{ selected }"><TreeViewDisclosure v-slot="{ expanded }" for="src" class="catalog-tree-disclosure" aria-label="Toggle source folder"><ChevronRight :size="16" :class="{ 'is-expanded': expanded }" /></TreeViewDisclosure><FolderOpen v-if="expandedValue.includes('src')" :size="18" /><Folder v-else :size="18" /><span>src</span><small>12 files</small><Check v-if="selected" class="catalog-tree-selected-icon" :size="16" aria-hidden="true" /></TreeViewItem>
          <TreeViewGroup v-if="expandedValue.includes('src')"><TreeViewItem value="components" class="catalog-tree-item catalog-tree-file" v-slot="{ selected }"><span class="catalog-tree-spacer" aria-hidden="true" /><FileCode2 :size="17" /><span>components.ts</span><small>8.4 KB</small><Check v-if="selected" class="catalog-tree-selected-icon" :size="16" aria-hidden="true" /></TreeViewItem><TreeViewItem value="tokens" class="catalog-tree-item catalog-tree-file" v-slot="{ selected }"><span class="catalog-tree-spacer" aria-hidden="true" /><FileCode2 :size="17" /><span>tokens.ts</span><small>3.1 KB</small><Check v-if="selected" class="catalog-tree-selected-icon" :size="16" aria-hidden="true" /></TreeViewItem></TreeViewGroup>
          <TreeViewItem value="tests" class="catalog-tree-item catalog-tree-folder" v-slot="{ selected }"><span class="catalog-tree-spacer" aria-hidden="true" /><Folder :size="18" /><span>tests</span><small>38 checks</small><Check v-if="selected" class="catalog-tree-selected-icon" :size="16" aria-hidden="true" /></TreeViewItem>
        </TreeViewGroup>
      </TreeViewRoot>

      <TreeGridRoot v-else-if="component === 'tree-grid'" :rows="treeGridRows" :get-cell-value="id => cellValues.get(id) ?? ''" :set-cell-value="(id, value) => cellValues.set(id, value)" :default-expanded-value="treeExpanded" :disabled-items="isScenario('unavailable-cells') ? ['src-status'] : []" class="catalog-tree-grid" v-slot="{ expandedValue }">
        <div class="catalog-grid-header" aria-hidden="true"><span>Name</span><span>Details</span><span>Status</span></div>
        <TreeGridRow value="sectile" :row-index="1" :expandable="true" class="catalog-grid-row">
          <TreeGridCell value="sectile-name" :column-index="1" class="catalog-grid-cell catalog-tree-grid-name"><TreeGridDisclosure v-slot="{ expanded }" for="sectile" class="catalog-tree-disclosure" aria-label="Toggle sectile project"><ChevronRight :size="16" :class="{ 'is-expanded': expanded }" aria-hidden="true" /></TreeGridDisclosure><FolderOpen v-if="expandedValue.includes('sectile')" :size="18" /><Folder v-else :size="18" /><span>sectile</span><TreeGridEditor for="sectile-name" label="Project name" /></TreeGridCell>
          <TreeGridCell value="sectile-branch" :column-index="2" class="catalog-grid-cell"><GitBranch :size="16" /> main</TreeGridCell>
          <TreeGridCell value="sectile-status" :column-index="3" class="catalog-grid-cell"><span class="catalog-status catalog-status--success">Healthy</span></TreeGridCell>
        </TreeGridRow>
        <TreeGridRow v-if="expandedValue.includes('sectile')" value="src" :row-index="2" :level="2" class="catalog-grid-row">
          <TreeGridCell value="src-name" :column-index="1" class="catalog-grid-cell catalog-tree-grid-name catalog-tree-grid-child"><Folder :size="18" /><span>src</span><TreeGridEditor for="src-name" label="Folder name" /></TreeGridCell>
          <TreeGridCell value="src-branch" :column-index="2" class="catalog-grid-cell">12 files</TreeGridCell>
          <TreeGridCell value="src-status" :column-index="3" class="catalog-grid-cell"><span class="catalog-status">Modified</span></TreeGridCell>
        </TreeGridRow>
        <TreeGridRow v-if="expandedValue.includes('sectile')" value="tests" :row-index="3" :level="2" class="catalog-grid-row">
          <TreeGridCell value="tests-name" :column-index="1" class="catalog-grid-cell catalog-tree-grid-name catalog-tree-grid-child"><Folder :size="18" /><span>tests</span><TreeGridEditor for="tests-name" label="Folder name" /></TreeGridCell>
          <TreeGridCell value="tests-branch" :column-index="2" class="catalog-grid-cell">38 checks</TreeGridCell>
          <TreeGridCell value="tests-status" :column-index="3" class="catalog-grid-cell"><span class="catalog-status catalog-status--success">Passing</span></TreeGridCell>
        </TreeGridRow>
      </TreeGridRoot>
    </div>
  </DemoCard>
</template>
