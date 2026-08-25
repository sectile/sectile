<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { createCalculatorExpression } from '@sectile/core/number-field';
import {
  CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Download, FileCode2, FilePlus2,
  FolderPlus, GitBranch, PackageCheck, Pause, Play, Share2, Star, Trash2, Upload, X,
} from '@lucide/vue';
import { CheckboxGroupIndicator, CheckboxGroupItem, CheckboxGroupRoot } from '@sectile/vue/checkbox-group';
import { PaginationFirst, PaginationItem, PaginationLast, PaginationNext, PaginationPrevious, PaginationRoot } from '@sectile/vue/pagination';
import { StepperContent, StepperList, StepperRoot, StepperStep } from '@sectile/vue/stepper';
import { RatingClear, RatingIndicator, RatingItem, RatingRoot } from '@sectile/vue/rating';
import { PinInputInput, PinInputRoot } from '@sectile/vue/pin-input';
import { TagsInputClear, TagsInputInput, TagsInputItem, TagsInputItemDelete, TagsInputItemText, TagsInputRoot } from '@sectile/vue/tags-input';
import { GridCell, GridRoot, GridRow } from '@sectile/vue/grid';
import { ToolbarItem, ToolbarRoot, ToolbarSeparator } from '@sectile/vue/toolbar';
import { WindowSplitterHandle, WindowSplitterPane, WindowSplitterRoot } from '@sectile/vue/window-splitter';
import { DatePickerContent, DatePickerInput, DatePickerRoot, DatePickerTrigger } from '@sectile/vue/date-picker';
import { DateRangePickerContent, DateRangePickerEndInput, DateRangePickerRoot, DateRangePickerStartInput, DateRangePickerTrigger, type DateValue } from '@sectile/vue/date-range-picker';
import { RangeCalendarCell, RangeCalendarContent, RangeCalendarGrid, RangeCalendarNextMonth, RangeCalendarPreviousMonth, RangeCalendarRoot } from '@sectile/vue/range-calendar';
import { MonthPickerCell, MonthPickerContent, MonthPickerGrid, MonthPickerInput, MonthPickerNextYear, MonthPickerPreviousYear, MonthPickerRoot, MonthPickerTrigger } from '@sectile/vue/month-picker';
import { MonthRangePickerCell, MonthRangePickerContent, MonthRangePickerEndInput, MonthRangePickerGrid, MonthRangePickerNextYear, MonthRangePickerPreviousYear, MonthRangePickerRoot, MonthRangePickerStartInput, MonthRangePickerTrigger } from '@sectile/vue/month-range-picker';
import { YearPickerCell, YearPickerContent, YearPickerGrid, YearPickerInput, YearPickerNextPage, YearPickerPreviousPage, YearPickerRoot, YearPickerTrigger } from '@sectile/vue/year-picker';
import { YearRangePickerCell, YearRangePickerContent, YearRangePickerEndInput, YearRangePickerGrid, YearRangePickerNextPage, YearRangePickerPreviousPage, YearRangePickerRoot, YearRangePickerStartInput, YearRangePickerTrigger } from '@sectile/vue/year-range-picker';
import { DateTimePickerContent, DateTimePickerDateInput, DateTimePickerRoot, DateTimePickerTimeInput, DateTimePickerTrigger, type DateTimeValue } from '@sectile/vue/date-time-picker';
import { DateTimeRangePickerContent, DateTimeRangePickerEndDateTimeInput, DateTimeRangePickerRoot, DateTimeRangePickerStartDateTimeInput, DateTimeRangePickerTrigger } from '@sectile/vue/date-time-range-picker';
import { QuantityFieldInput, QuantityFieldRoot, QuantityFieldValue, createStandardQuantityPolicies } from '@sectile/vue/quantity-field';
import { DialogClose, DialogContent, DialogDescription, DialogOverlay, DialogRoot, DialogTitle, DialogTrigger } from '@sectile/vue/dialog';
import { AlertDialogClose, AlertDialogContent, AlertDialogDescription, AlertDialogOverlay, AlertDialogRoot, AlertDialogTitle, AlertDialogTrigger } from '@sectile/vue/alert-dialog';
import { TooltipArrow, TooltipContent, TooltipRoot, TooltipTrigger } from '@sectile/vue/tooltip';
import { MultiThumbSliderRange, MultiThumbSliderRoot, MultiThumbSliderThumb, MultiThumbSliderTrack } from '@sectile/vue/multi-thumb-slider';
import { MenuItem, MenuRoot, MenuSeparator, MenuSubContent } from '@sectile/vue/menu';
import { MenuButtonContent, MenuButtonRoot, MenuButtonTrigger, MenuItem as MenuButtonItem, MenuSeparator as MenuButtonSeparator, MenuSubContent as MenuButtonSubContent } from '@sectile/vue/menu-button';
import { NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot, NavigationMenuTrigger, NavigationMenuViewport } from '@sectile/vue/navigation-menu';
import { CarouselIndicator, CarouselIndicatorGroup, CarouselNext, CarouselPause, CarouselPrevious, CarouselRoot, CarouselSlide, CarouselTrack } from '@sectile/vue/carousel';
import { ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxRoot } from '@sectile/vue/combobox';
import { componentExampleSources } from '../component-example-sources.js';
import { multiThumbSliderExampleState } from '../catalog-example-state.js';
import type { PinInputExampleOptions } from '../pin-input-example-options.js';
import CalendarExample from './CalendarExample.vue';
import DemoCard from './DemoCard.vue';
import DemoSelect from './DemoSelect.vue';
import MenubarExample from './MenubarExample.vue';
import PickerCalendarDemo from './PickerCalendarDemo.vue';

const props = defineProps<{
  readonly component: string;
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
  readonly pinInputOptions?: PinInputExampleOptions | undefined;
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
const toolbarItems = computed(() => isScenario('vertical') ? ['select', 'comment', 'upload'] : ['bold', 'italic', 'link']);
const commandMenuItems = [
  { id: 'new-project', parentID: null },
  { id: 'open-project', parentID: null },
  { id: 'save-project', parentID: null },
];
const nestedMenuItems = [
  { id: 'export', parentID: null },
  { id: 'pdf', parentID: 'export' },
  { id: 'markdown', parentID: 'export' },
  { id: 'csv', parentID: 'export' },
  { id: 'share', parentID: null },
];
const menuItems = computed(() => isScenario('nested') ? nestedMenuItems : commandMenuItems);
const navigationMenuItems = [
  { id: 'file', parentID: null },
  { id: 'new', parentID: 'file' },
  { id: 'open', parentID: 'file' },
  { id: 'help', parentID: null },
];
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
const monthValue = Object.freeze({ year: 2026, month: 8, day: 1 });
const monthRange = Object.freeze({ start: Object.freeze({ year: 2026, month: 4, day: 1 }), end: Object.freeze({ year: 2026, month: 9, day: 1 }) });
const yearValue = Object.freeze({ year: 2028, month: 1, day: 1 });
const yearRange = Object.freeze({ start: Object.freeze({ year: 2026, month: 1, day: 1 }), end: Object.freeze({ year: 2030, month: 1, day: 1 }) });
const monthNames = Object.freeze(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
const weekdayNames = Object.freeze(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
const dateTime = Object.freeze({ date, time: Object.freeze({ hour: 9, minute: 30, second: 0, millisecond: 0 }) });
const morningDateTime = Object.freeze({ date: dateRange.end, time: Object.freeze({ hour: 7, minute: 45, second: 0, millisecond: 0 }) });
const controlledDateTime = ref<DateTimeValue | null>(Object.freeze({ date: Object.freeze({ year: 2026, month: 9, day: 3 }), time: Object.freeze({ hour: 14, minute: 15, second: 0, millisecond: 0 }) }));
const dateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date: dateRange.end, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const sameDayDateTimeRange = Object.freeze({ start: dateTime, end: Object.freeze({ date, time: Object.freeze({ hour: 17, minute: 30, second: 0, millisecond: 0 }) }) });
const standardQuantityPolicies = createStandardQuantityPolicies('metre', 'metric');
const quantityEvaluator = createCalculatorExpression({ precision: 12, rounding: 'half-even' });
const quantityPolicies = computed(() => (
  ['calculator', 'compound'].includes(props.scenario)
    ? Object.freeze({ ...standardQuantityPolicies, evaluator: quantityEvaluator })
    : standardQuantityPolicies
));
const quantityUnitOptions = Object.freeze([
  { id: 'millimetre', label: 'mm' },
  { id: 'centimetre', label: 'cm' },
  { id: 'metre', label: 'm' },
  { id: 'kilometre', label: 'km' },
]);
const quantityDisplayUnit = ref(props.scenario === 'length' ? 'centimetre' : 'metre');
const parts: Record<string, readonly string[]> = {
  'checkbox-group': ['CheckboxGroupRoot', 'CheckboxGroupItem', 'CheckboxGroupIndicator'], select: ['SelectRoot', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem'],
  pagination: ['PaginationRoot', 'PaginationItem', 'PaginationPrevious', 'PaginationNext'], stepper: ['StepperRoot', 'StepperList', 'StepperStep', 'StepperContent'],
  rating: ['RatingRoot', 'RatingItem', 'RatingIndicator', 'RatingClear'], 'pin-input': ['PinInputRoot', 'PinInputInput'], 'tags-input': ['TagsInputRoot', 'TagsInputItem', 'TagsInputInput'],
  grid: ['GridRoot', 'GridRow', 'GridCell'], toolbar: ['ToolbarRoot', 'ToolbarItem', 'ToolbarSeparator'], 'window-splitter': ['WindowSplitterRoot', 'WindowSplitterPane', 'WindowSplitterHandle'],
  'date-picker': ['DatePickerRoot', 'DatePickerTrigger', 'DatePickerInput', 'DatePickerContent', 'DatePickerPreviousWeek', 'DatePickerPreviousMonth', 'DatePickerPreviousYear', 'DatePickerNextWeek', 'DatePickerNextMonth', 'DatePickerNextYear', 'DatePickerWeekViewTrigger', 'DatePickerMonthViewTrigger', 'DatePickerYearViewTrigger', 'DatePickerGrid', 'DatePickerCell', 'DatePickerMonthCell'],
  'date-range-picker': ['DateRangePickerRoot', 'DateRangePickerStartInput', 'DateRangePickerEndInput', 'DateRangePickerTrigger', 'DateRangePickerContent', 'DateRangePickerPreviousWeek', 'DateRangePickerPreviousMonth', 'DateRangePickerPreviousYear', 'DateRangePickerNextWeek', 'DateRangePickerNextMonth', 'DateRangePickerNextYear', 'DateRangePickerWeekViewTrigger', 'DateRangePickerMonthViewTrigger', 'DateRangePickerYearViewTrigger', 'DateRangePickerGrid', 'DateRangePickerCell', 'DateRangePickerMonthCell'],
  'range-calendar': ['RangeCalendarRoot', 'RangeCalendarContent', 'RangeCalendarGrid', 'RangeCalendarCell', 'RangeCalendarPreviousMonth', 'RangeCalendarNextMonth', 'RangeCalendarPreviousYear', 'RangeCalendarNextYear'],
  'month-picker': ['MonthPickerRoot', 'MonthPickerInput', 'MonthPickerTrigger', 'MonthPickerContent', 'MonthPickerGrid', 'MonthPickerCell', 'MonthPickerPreviousYear', 'MonthPickerNextYear'],
  'month-range-picker': ['MonthRangePickerRoot', 'MonthRangePickerStartInput', 'MonthRangePickerEndInput', 'MonthRangePickerTrigger', 'MonthRangePickerContent', 'MonthRangePickerGrid', 'MonthRangePickerCell', 'MonthRangePickerPreviousYear', 'MonthRangePickerNextYear'],
  'year-picker': ['YearPickerRoot', 'YearPickerInput', 'YearPickerTrigger', 'YearPickerContent', 'YearPickerGrid', 'YearPickerCell', 'YearPickerPreviousPage', 'YearPickerNextPage'],
  'year-range-picker': ['YearRangePickerRoot', 'YearRangePickerStartInput', 'YearRangePickerEndInput', 'YearRangePickerTrigger', 'YearRangePickerContent', 'YearRangePickerGrid', 'YearRangePickerCell', 'YearRangePickerPreviousPage', 'YearRangePickerNextPage'],
  'date-time-picker': ['DateTimePickerRoot', 'DateTimePickerDateInput', 'DateTimePickerTimeInput', 'DateTimePickerTrigger', 'DateTimePickerContent', 'DateTimePickerPreviousWeek', 'DateTimePickerPreviousMonth', 'DateTimePickerPreviousYear', 'DateTimePickerNextWeek', 'DateTimePickerNextMonth', 'DateTimePickerNextYear', 'DateTimePickerWeekViewTrigger', 'DateTimePickerMonthViewTrigger', 'DateTimePickerYearViewTrigger', 'DateTimePickerGrid', 'DateTimePickerCell', 'DateTimePickerMonthCell'],
  'date-time-range-picker': ['DateTimeRangePickerRoot', 'DateTimeRangePickerStartDateTimeInput', 'DateTimeRangePickerEndDateTimeInput', 'DateTimeRangePickerTrigger', 'DateTimeRangePickerContent', 'DateTimeRangePickerPreviousWeek', 'DateTimeRangePickerPreviousMonth', 'DateTimeRangePickerPreviousYear', 'DateTimeRangePickerNextWeek', 'DateTimeRangePickerNextMonth', 'DateTimeRangePickerNextYear', 'DateTimeRangePickerWeekViewTrigger', 'DateTimeRangePickerMonthViewTrigger', 'DateTimeRangePickerYearViewTrigger', 'DateTimeRangePickerGrid', 'DateTimeRangePickerCell', 'DateTimeRangePickerMonthCell'],
  'quantity-field': ['QuantityFieldRoot', 'QuantityFieldInput'], dialog: ['DialogRoot', 'DialogTrigger', 'DialogContent'], 'alert-dialog': ['AlertDialogRoot', 'AlertDialogTrigger', 'AlertDialogContent'],
  tooltip: ['TooltipRoot', 'TooltipTrigger', 'TooltipContent', 'TooltipArrow'], 'multi-thumb-slider': ['MultiThumbSliderRoot', 'MultiThumbSliderTrack', 'MultiThumbSliderThumb'], menu: ['MenuRoot', 'MenuItem', 'MenuSubContent'],
  menubar: ['MenubarRoot', 'MenubarItem', 'MenubarContent', 'MenubarSeparator'], 'menu-button': ['MenuButtonRoot', 'MenuButtonTrigger', 'MenuButtonContent'], carousel: ['CarouselRoot', 'CarouselSlide', 'CarouselPrevious', 'CarouselNext'],
  'navigation-menu': ['NavigationMenuRoot', 'NavigationMenuList', 'NavigationMenuItem', 'NavigationMenuTrigger', 'NavigationMenuContent', 'NavigationMenuViewport', 'NavigationMenuLink'],
  feed: ['FeedRoot', 'FeedItem', 'FeedLoadEarlier', 'FeedLoadNewer'], calendar: ['CalendarRoot', 'CalendarCell'], combobox: ['ComboboxRoot', 'ComboboxInput', 'ComboboxContent', 'ComboboxItem'],
};
const code = computed(() => {
  const source = componentExampleSources(props.component, props.scenario).vue;
  if (source === undefined) throw new Error(`Missing exact Vue example: ${props.component}/${props.scenario}`);
  return source;
});
const state = computed(() => ({ component: props.component, scenario: props.scenario, parts: parts[props.component] ?? [] }));
const isScenario = (...values: readonly string[]) => values.includes(props.scenario);
const unavailableBookingDates = new Set(['2026-08-27', '2026-08-29']);
const dateKey = (value: DateValue): string => `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
const dateRangePickerPolicies = computed(() => ({
  ...(isScenario('bounded')
    ? { min: Object.freeze({ year: 2026, month: 8, day: 10 }), max: Object.freeze({ year: 2026, month: 8, day: 30 }) }
    : {}),
  unavailable: (value: DateValue): boolean => unavailableBookingDates.has(dateKey(value)),
}));
const selectedItems = computed(() => isScenario('release-channels') ? ['stable', 'preview'] : ['stable']);
const sliderExample = computed(() => multiThumbSliderExampleState(props.scenario));
const gridRows = computed(() => isScenario('editable', 'controlled', 'disabled-wrap')
  ? [['Production', 'Ready', 'v0.2'], ['Preview', 'Pending', 'next']]
  : [['Core', 'Ready'], ['Vue', 'Active']]);
const checkoutValue = ref('delivery');
const pinValue = ref('');
const pinOptions = computed(() => {
  if (props.pinInputOptions === undefined) throw new Error('Pin Input examples require editable options.');
  return props.pinInputOptions;
});
const pinLength = computed(() => pinOptions.value.length);
const pinRootProps = computed(() => ({
  length: pinLength.value,
  mask: pinOptions.value.mask,
  otp: pinOptions.value.otp,
  readonly: pinOptions.value.readonly,
  disabled: pinOptions.value.disabled,
  ...(isScenario('controlled')
    ? { modelValue: pinValue.value }
    : { defaultValue: pinOptions.value.value }),
}));
const pinDemoKey = computed(() => `${props.scenario}:${pinLength.value}:${pinOptions.value.value}`);
if (props.component === 'pin-input') {
  if (props.pinInputOptions === undefined) throw new Error('Pin Input examples require editable options.');
  watch(() => props.pinInputOptions?.value, (value) => { pinValue.value = value ?? ''; }, { immediate: true });
}
const actionStatus = ref('');
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
    bold: 'Bold', italic: 'Italic', link: 'Link', select: 'Select', comment: 'Comment', upload: 'Upload',
    'new-project': 'New project', 'open-project': 'Open project', 'save-project': 'Save project', help: 'Help',
    'new-file': 'New file', 'new-folder': 'New folder', import: 'Import', download: 'Download', share: 'Share',
    export: 'Export', pdf: 'PDF', markdown: 'Markdown', csv: 'CSV',
  });
  actionStatus.value = `${labels[value] ?? value} action invoked`;
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
    :class="{ 'temporal-picker-card': ['date-picker', 'date-range-picker', 'range-calendar', 'month-picker', 'month-range-picker', 'year-picker', 'year-range-picker', 'date-time-picker', 'date-time-range-picker'].includes(component) }"
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
        <DemoSelect
          :options="environments"
          :disabled-items="isScenario('disabled-option') ? ['development'] : []"
          default-value="production"
          :default-open="isScenario('disabled-option')"
          label="Deployment environment"
        />
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

      <PinInputRoot
        v-else-if="component === 'pin-input'"
        :key="pinDemoKey"
        v-bind="pinRootProps"
        @update:model-value="pinValue = $event"
        class="catalog-inline"
      >
        <PinInputInput
          v-for="index in pinLength"
          :key="index"
          :index="index - 1"
          :placeholder="pinOptions.placeholder || undefined"
          class="catalog-pin"
        />
      </PinInputRoot>

      <div v-else-if="component === 'tags-input'" class="catalog-tags-demo">
        <TagsInputRoot
          :default-value="['Vue', 'DOM', 'Accessibility']"
          label="Project skills"
          class="catalog-tags-input"
          v-slot="{ value: tags }"
        >
          <TagsInputItem v-for="(_, index) in tags" :key="index" :index="index" class="catalog-tag">
            <TagsInputItemText />
            <TagsInputItemDelete class="catalog-tag-delete" :aria-label="`Remove ${tags[index]}`">
              <X :size="14" aria-hidden="true" />
            </TagsInputItemDelete>
          </TagsInputItem>
          <TagsInputInput class="catalog-tags-input-control" placeholder="Add a skill…" />
          <TagsInputClear class="catalog-tags-clear">
            <Trash2 :size="15" aria-hidden="true" />
            <span>Clear all</span>
          </TagsInputClear>
        </TagsInputRoot>
        <p class="catalog-tags-help">Press Enter or comma to add a tag.</p>
      </div>

      <GridRoot v-else-if="component === 'grid'" :rows="gridRows" :disabled-items="isScenario('disabled-wrap') ? ['Pending'] : []" :readonly="!isScenario('editable')" class="catalog-grid">
        <GridRow v-for="row in gridRows" :key="row.join(':')" class="catalog-grid-row"><GridCell v-for="cell in row" :key="cell" :value="cell" class="catalog-grid-cell">{{ cell }}</GridCell></GridRow>
      </GridRoot>

      <div v-else-if="component === 'toolbar'" class="catalog-action-demo catalog-toolbar-demo">
        <ToolbarRoot :items="toolbarItems" :orientation="isScenario('vertical') ? 'vertical' : 'horizontal'" :label="isScenario('vertical') ? 'Canvas tools' : 'Text formatting'" :class="['catalog-toolbar', { 'catalog-toolbar--vertical': isScenario('vertical') }]" @invoke="recordAction">
          <template v-if="isScenario('vertical')">
            <ToolbarItem value="select"><Check :size="17" aria-hidden="true" /><span>Select</span></ToolbarItem>
            <ToolbarItem value="comment"><FilePlus2 :size="17" aria-hidden="true" /><span>Comment</span></ToolbarItem>
            <ToolbarSeparator />
            <ToolbarItem value="upload"><Upload :size="17" aria-hidden="true" /><span>Upload</span></ToolbarItem>
          </template>
          <template v-else>
            <ToolbarItem value="bold"><strong>B</strong><span class="sr-only">Bold</span></ToolbarItem>
            <ToolbarItem value="italic"><em>I</em><span class="sr-only">Italic</span></ToolbarItem>
            <ToolbarSeparator />
            <ToolbarItem value="link">Link</ToolbarItem>
          </template>
        </ToolbarRoot>
        <p v-if="actionStatus" class="catalog-action-status" role="status" aria-live="polite">{{ actionStatus }}</p>
      </div>

      <WindowSplitterRoot v-else-if="component === 'window-splitter'" :default-value="isScenario('vertical') ? 68 : 42" :orientation="isScenario('vertical') ? 'vertical' : 'horizontal'" class="catalog-splitter">
        <WindowSplitterPane side="before" class="catalog-pane">Navigator</WindowSplitterPane><WindowSplitterHandle class="catalog-handle" /><WindowSplitterPane side="after" class="catalog-pane">Editor</WindowSplitterPane>
      </WindowSplitterRoot>

      <DatePickerRoot v-else-if="component === 'date-picker'" :default-value="isScenario('weekdays') ? dateRange.end : date" :default-open="true" :default-view="isScenario('weekdays') ? 'week' : 'month'" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-inline"><DatePickerInput class="catalog-input" /><DatePickerTrigger class="catalog-picker-trigger" aria-label="Open date picker"><CalendarDays :size="18" aria-hidden="true" /></DatePickerTrigger></div>
        <DatePickerContent class="catalog-popup catalog-picker-popup">
          <PickerCalendarDemo component="date-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" />
        </DatePickerContent>
      </DatePickerRoot>

      <DateRangePickerRoot v-else-if="component === 'date-range-picker'" :default-value="dateRange" :default-open="true" :policies="dateRangePickerPolicies" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-inline"><DateRangePickerStartInput class="catalog-input" /><DateRangePickerEndInput class="catalog-input" /><DateRangePickerTrigger class="catalog-picker-trigger" aria-label="Open date range picker"><CalendarDays :size="18" aria-hidden="true" /></DateRangePickerTrigger></div>
        <DateRangePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-range-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateRangePickerContent>
      </DateRangePickerRoot>

      <RangeCalendarRoot v-else-if="component === 'range-calendar'" :default-value="dateRange" v-slot="{ dates, view }" class="catalog-stack catalog-temporal-picker">
        <RangeCalendarContent class="catalog-picker-popup catalog-period-picker">
          <div class="catalog-picker-navigation">
            <RangeCalendarPreviousMonth aria-label="Previous month"><ChevronLeft :size="17" /></RangeCalendarPreviousMonth>
            <strong>{{ monthNames[view.month - 1] }} {{ view.year }}</strong>
            <RangeCalendarNextMonth aria-label="Next month"><ChevronRight :size="17" /></RangeCalendarNextMonth>
          </div>
          <div class="catalog-picker-weekdays"><span v-for="day in weekdayNames" :key="day">{{ day }}</span></div>
          <RangeCalendarGrid class="catalog-calendar">
            <RangeCalendarCell v-for="day in dates.flat()" :key="[day.year, day.month, day.day].join('-')" :value="day">{{ day.day }}</RangeCalendarCell>
          </RangeCalendarGrid>
        </RangeCalendarContent>
      </RangeCalendarRoot>

      <MonthPickerRoot v-else-if="component === 'month-picker'" :default-value="monthValue" :default-open="true" v-slot="{ months, view }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-inline"><MonthPickerInput class="catalog-input" aria-label="Billing month" /><MonthPickerTrigger class="catalog-picker-trigger" aria-label="Open month picker"><CalendarDays :size="18" aria-hidden="true" /></MonthPickerTrigger></div>
        <MonthPickerContent class="catalog-picker-popup catalog-period-picker">
          <div class="catalog-picker-navigation"><MonthPickerPreviousYear aria-label="Previous year"><ChevronLeft :size="17" /></MonthPickerPreviousYear><strong>{{ view.year }}</strong><MonthPickerNextYear aria-label="Next year"><ChevronRight :size="17" /></MonthPickerNextYear></div>
          <MonthPickerGrid class="catalog-month-grid"><MonthPickerCell v-for="month in months.flat()" :key="`${month.year}-${month.month}`" :value="month">{{ monthNames[month.month - 1] }}</MonthPickerCell></MonthPickerGrid>
        </MonthPickerContent>
      </MonthPickerRoot>

      <MonthRangePickerRoot v-else-if="component === 'month-range-picker'" :default-value="monthRange" :default-open="true" v-slot="{ months, view }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-range-fields"><label class="catalog-endpoint"><span>From</span><MonthRangePickerStartInput class="catalog-input" /></label><label class="catalog-endpoint"><span>To</span><MonthRangePickerEndInput class="catalog-input" /></label><MonthRangePickerTrigger class="catalog-picker-trigger" aria-label="Open month range picker"><CalendarDays :size="18" aria-hidden="true" /></MonthRangePickerTrigger></div>
        <MonthRangePickerContent class="catalog-picker-popup catalog-period-picker">
          <div class="catalog-picker-navigation"><MonthRangePickerPreviousYear aria-label="Previous year"><ChevronLeft :size="17" /></MonthRangePickerPreviousYear><strong>{{ view.year }}</strong><MonthRangePickerNextYear aria-label="Next year"><ChevronRight :size="17" /></MonthRangePickerNextYear></div>
          <MonthRangePickerGrid class="catalog-month-grid"><MonthRangePickerCell v-for="month in months.flat()" :key="`${month.year}-${month.month}`" :value="month">{{ monthNames[month.month - 1] }}</MonthRangePickerCell></MonthRangePickerGrid>
        </MonthRangePickerContent>
      </MonthRangePickerRoot>

      <YearPickerRoot v-else-if="component === 'year-picker'" :default-value="yearValue" :default-open="true" v-slot="{ years }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-inline"><YearPickerInput class="catalog-input" aria-label="Graduation year" /><YearPickerTrigger class="catalog-picker-trigger" aria-label="Open year picker"><CalendarDays :size="18" aria-hidden="true" /></YearPickerTrigger></div>
        <YearPickerContent class="catalog-picker-popup catalog-period-picker">
          <div class="catalog-picker-navigation"><YearPickerPreviousPage aria-label="Previous years"><ChevronLeft :size="17" /></YearPickerPreviousPage><strong>{{ years.flat()[0]?.year }}–{{ years.flat()[years.flat().length - 1]?.year }}</strong><YearPickerNextPage aria-label="Next years"><ChevronRight :size="17" /></YearPickerNextPage></div>
          <YearPickerGrid class="catalog-month-grid catalog-year-grid"><YearPickerCell v-for="year in years.flat()" :key="year.year" :value="year">{{ year.year }}</YearPickerCell></YearPickerGrid>
        </YearPickerContent>
      </YearPickerRoot>

      <YearRangePickerRoot v-else-if="component === 'year-range-picker'" :default-value="yearRange" :default-open="true" v-slot="{ years }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-range-fields"><label class="catalog-endpoint"><span>From</span><YearRangePickerStartInput class="catalog-input" /></label><label class="catalog-endpoint"><span>To</span><YearRangePickerEndInput class="catalog-input" /></label><YearRangePickerTrigger class="catalog-picker-trigger" aria-label="Open year range picker"><CalendarDays :size="18" aria-hidden="true" /></YearRangePickerTrigger></div>
        <YearRangePickerContent class="catalog-picker-popup catalog-period-picker">
          <div class="catalog-picker-navigation"><YearRangePickerPreviousPage aria-label="Previous years"><ChevronLeft :size="17" /></YearRangePickerPreviousPage><strong>{{ years.flat()[0]?.year }}–{{ years.flat()[years.flat().length - 1]?.year }}</strong><YearRangePickerNextPage aria-label="Next years"><ChevronRight :size="17" /></YearRangePickerNextPage></div>
          <YearRangePickerGrid class="catalog-month-grid catalog-year-grid"><YearRangePickerCell v-for="year in years.flat()" :key="year.year" :value="year">{{ year.year }}</YearRangePickerCell></YearRangePickerGrid>
        </YearRangePickerContent>
      </YearRangePickerRoot>

      <DateTimePickerRoot v-else-if="component === 'date-time-picker'" v-bind="dateTimePickerProps" :default-open="isScenario('morning')" :default-view="isScenario('morning') ? 'week' : 'month'" @update:model-value="updateControlledDateTime" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-range-fields catalog-range-fields--single">
          <label class="catalog-endpoint">
            <span>Date and time</span>
            <span class="catalog-date-time-control">
              <DateTimePickerDateInput class="catalog-input" aria-label="Date" />
              <DateTimePickerTimeInput class="catalog-input catalog-time-input" aria-label="Time" />
            </span>
          </label>
          <DateTimePickerTrigger class="catalog-picker-trigger" aria-label="Open date and time picker"><CalendarDays :size="18" aria-hidden="true" /></DateTimePickerTrigger>
        </div>
        <DateTimePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-time-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateTimePickerContent>
      </DateTimePickerRoot>
      <DateTimeRangePickerRoot v-else-if="component === 'date-time-range-picker'" :default-value="isScenario('office-hours') ? sameDayDateTimeRange : dateTimeRange" :default-view="isScenario('office-hours') ? 'week' : 'month'" v-slot="{ dates, months, view, viewMode }" class="catalog-stack catalog-temporal-picker">
        <div class="catalog-range-fields">
          <label class="catalog-endpoint">
            <span>Start</span>
            <DateTimeRangePickerStartDateTimeInput class="catalog-input" aria-label="Start date and time" />
          </label>
          <label class="catalog-endpoint">
            <span>End</span>
            <DateTimeRangePickerEndDateTimeInput class="catalog-input" aria-label="End date and time" />
          </label>
          <DateTimeRangePickerTrigger class="catalog-picker-trigger" aria-label="Open date and time range picker"><CalendarDays :size="18" aria-hidden="true" /></DateTimeRangePickerTrigger>
        </div>
        <DateTimeRangePickerContent class="catalog-popup catalog-picker-popup"><PickerCalendarDemo component="date-time-range-picker" :dates="dates" :months="months" :view="view" :view-mode="viewMode" /></DateTimeRangePickerContent>
      </DateTimeRangePickerRoot>

      <QuantityFieldRoot
        v-else-if="component === 'quantity-field'"
        :policies="quantityPolicies"
        :default-value="{ value: isScenario('calculator', 'controlled') ? '2.5' : '1.25', unit: 'metre' }"
        :display-unit="quantityDisplayUnit"
        @update:display-unit="quantityDisplayUnit = $event"
        class="catalog-inline"
      >
        <QuantityFieldInput class="catalog-input" />
        <DemoSelect
          :model-value="quantityDisplayUnit"
          :options="quantityUnitOptions"
          label="Display unit"
          class="quantity-unit-select"
          @update:model-value="quantityDisplayUnit = $event ?? quantityDisplayUnit"
        />
        <QuantityFieldValue />
      </QuantityFieldRoot>

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
        <AlertDialogContent class="catalog-dialog catalog-alert-dialog">
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

      <div v-else-if="component === 'menu'" class="catalog-action-demo catalog-menu-demo">
        <MenuRoot :items="menuItems" class="catalog-menu" @invoke="recordAction">
          <template v-if="isScenario('nested')">
            <MenuItem value="export" class="catalog-menu-command"><FileCode2 :size="17" aria-hidden="true" /><span>Export as</span><ChevronRight :size="15" aria-hidden="true" /></MenuItem>
            <MenuSubContent for="export" class="catalog-submenu catalog-menu-submenu">
              <MenuItem value="pdf" class="catalog-menu-command"><span>PDF document</span><kbd>.pdf</kbd></MenuItem>
              <MenuItem value="markdown" class="catalog-menu-command"><span>Markdown</span><kbd>.md</kbd></MenuItem>
              <MenuItem value="csv" class="catalog-menu-command"><span>CSV data</span><kbd>.csv</kbd></MenuItem>
            </MenuSubContent>
            <MenuSeparator class="catalog-menu-separator" />
            <MenuItem value="share" class="catalog-menu-command"><Share2 :size="17" aria-hidden="true" /><span>Share link</span><kbd>⌘L</kbd></MenuItem>
          </template>
          <template v-else>
            <MenuItem value="new-project" class="catalog-menu-command"><FilePlus2 :size="17" aria-hidden="true" /><span>New project</span><kbd>⌘N</kbd></MenuItem>
            <MenuItem value="open-project" class="catalog-menu-command"><FolderPlus :size="17" aria-hidden="true" /><span>Open project</span><kbd>⌘O</kbd></MenuItem>
            <MenuSeparator class="catalog-menu-separator" />
            <MenuItem value="save-project" class="catalog-menu-command"><PackageCheck :size="17" aria-hidden="true" /><span>Save project</span><kbd>⌘S</kbd></MenuItem>
          </template>
        </MenuRoot>
        <p v-if="actionStatus" class="catalog-action-status" role="status" aria-live="polite">{{ actionStatus }}</p>
      </div>
      <MenubarExample v-else-if="component === 'menubar'" :scenario="scenario" />
      <div v-else-if="component === 'menu-button'" class="catalog-action-demo catalog-menu-button-demo">
        <MenuButtonRoot :items="menuButtonItems" :default-open="true" @invoke="recordAction">
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
      <NavigationMenuRoot v-else-if="component === 'navigation-menu'" :items="navigationMenuItems" :disabled="isScenario('disabled')" label="Primary" class="catalog-navigation-menu" v-slot="{ openPath }">
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

      <CalendarExample v-else-if="component === 'calendar'" :scenario="scenario" />

      <div v-else-if="component === 'combobox'" class="catalog-field-shell">
        <span class="catalog-field-label">Add an environment</span>
        <ComboboxRoot
          :items="environments"
          :default-input-value="isScenario('contains') ? 'age' : 'pro'"
          :default-open="!isScenario('ime')"
          class="demo-collection-root"
        >
          <ComboboxInput
            class="demo-collection-field"
            aria-label="Search environments"
            placeholder="Search environments…"
          />
          <ComboboxContent class="demo-collection-surface">
            <ComboboxItem
              v-for="item in environments"
              :key="item.id"
              v-slot="{ selected }"
              :value="item.id"
              class="demo-collection-option demo-collection-option--detailed"
            >
              <span class="demo-collection-copy">
                <strong>{{ item.label }}</strong>
                <small>{{ item.detail }}</small>
              </span>
              <Check
                v-if="selected"
                class="demo-collection-indicator"
                :size="15"
                :stroke-width="2.4"
                aria-hidden="true"
              />
            </ComboboxItem>
            <ComboboxEmpty class="demo-collection-empty">No environments match this search.</ComboboxEmpty>
          </ComboboxContent>
        </ComboboxRoot>
      </div>

    </div>
  </DemoCard>
</template>
