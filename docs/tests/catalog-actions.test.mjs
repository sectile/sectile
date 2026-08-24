import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url), 'utf8');
const feedSource = await readFile(new URL('../.vitepress/theme/components/FeedCase.vue', import.meta.url), 'utf8');
const menubarSource = await readFile(new URL('../.vitepress/theme/components/MenubarExample.vue', import.meta.url), 'utf8');
const pickerSource = await readFile(new URL('../.vitepress/theme/components/PickerCalendarDemo.vue', import.meta.url), 'utf8');
const pickerAnatomySource = await readFile(new URL('../.vitepress/theme/components/DateTimePickerAnatomy.vue', import.meta.url), 'utf8');
const treeViewSource = await readFile(new URL('../.vitepress/theme/components/TreeViewCase.vue', import.meta.url), 'utf8');
const catalogCodeSource = await readFile(new URL('../.vitepress/theme/catalog-code.ts', import.meta.url), 'utf8');
const styles = await readFile(new URL('../.vitepress/theme/component-examples.css', import.meta.url), 'utf8');

test('host-owned demo actions always update visible example state', () => {
  assert.match(feedSource, /@request-window="loadWindow"/);
  assert.match(feedSource, /:revision="revision"/);
  assert.match(source, /@click="advanceCheckout\(step\.id\)"/);
  assert.match(source, /<ToolbarRoot[^>]+@invoke="recordAction"/);
  assert.match(source, /<MenuRoot[^>]+@invoke="recordAction"/);
  assert.match(source, /<MenubarExample[^>]+:scenario="scenario"/);
  assert.match(menubarSource, /<MenubarRoot[^>]+@invoke="recordAction"/);
  assert.match(source, /<MenuButtonRoot[^>]+@invoke="recordAction"/);
});

test('menubar examples expose complete command hierarchies and distinct scenarios', () => {
  assert.match(menubarSource, /default-highlighted-value="file"/);
  assert.match(menubarSource, /:disabled-items="disabledItems"/);
  assert.match(menubarSource, /props\.scenario === 'typeahead'/);
  assert.match(menubarSource, /<MenubarContent for="file"/);
  assert.match(menubarSource, /<MenubarContent for="edit"/);
  assert.match(menubarSource, /<MenubarContent for="view"/);
  assert.match(menubarSource, /<MenubarContent for="help"/);
  assert.match(menubarSource, /<kbd>Ctrl\+N<\/kbd>/);
});

test('menu button examples expose useful flat and nested command sets', () => {
  assert.match(source, /const menuButtonItems = computed/u);
  assert.match(source, /<MenuButtonTrigger class="catalog-menu-button-trigger">/u);
  assert.match(source, /<MenuButtonSeparator class="catalog-menu-button-separator"/u);
  assert.match(source, /<MenuButtonSubContent for="export"/u);
  assert.match(source, /New file/u);
  assert.match(source, /PDF document/u);
  assert.match(styles, /\.catalog-menu-button-item\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\) auto;/su);
});

test('navigation menu panels honor their closed disclosure state', () => {
  assert.match(styles, /\.catalog-navigation-panel\[hidden\]\s*\{\s*display:\s*none;/);
  assert.match(styles, /\.catalog-navigation-panel\s*\{[^}]*position:\s*static\s*!important;[^}]*inset:\s*auto\s*!important;/s);
});

test('navigation menu keeps equal insets, aligned items, and an anchored popup gap', () => {
  assert.match(styles, /\.catalog-navigation-menu \.catalog-navigation-list\s*\{[^}]*padding:\s*0\.35rem;/s);
  assert.match(styles, /\.catalog-navigation-menu \.catalog-navigation-item\s*\{[^}]*position:\s*static;[^}]*margin:\s*0;/s);
  assert.match(styles, /\.catalog-navigation-trigger, \.catalog-navigation-link\s*\{[^}]*height:\s*2\.5rem;[^}]*line-height:\s*1;/s);
  assert.match(styles, /\.catalog-navigation-viewport\s*\{[^}]*top:\s*calc\(100% \+ 0\.5rem\)[^}]*width:\s*min\(29rem, 100%\)[^}]*overflow:\s*hidden;/s);
  assert.match(source, /<NavigationMenuViewport v-show="openPath\.includes\('file'\)"/);
});

test('menu and toolbar scenarios render materially different structures', () => {
  assert.match(source, /const commandMenuItems = \[/u);
  assert.match(source, /const nestedMenuItems = \[/u);
  assert.match(source, /isScenario\('nested'\) \? nestedMenuItems : commandMenuItems/u);
  assert.match(source, /isScenario\('vertical'\) \? \['select', 'comment', 'upload'\]/u);
  assert.match(catalogCodeSource, /const menuScenarioCode/u);
  assert.match(catalogCodeSource, /const toolbarScenarioCode/u);
});

test('navigation menu scenarios document different information architectures', () => {
  assert.match(catalogCodeSource, /const navigationMenuScenarioCode/u);
  assert.match(catalogCodeSource, /product: sfc\([\s\S]*?New releases[\s\S]*?Open source/u);
  assert.match(catalogCodeSource, /links: sfc\([\s\S]*?Guides[\s\S]*?API reference/u);
  assert.match(catalogCodeSource, /'navigation-menu': navigationMenuScenarioCode/u);
});

test('disabled grid examples only reference cells present in their row model', () => {
  assert.match(source, /isScenario\('editable', 'controlled', 'disabled-wrap'\)/);
  assert.match(source, /\['Preview', 'Pending', 'next'\]/);
  assert.match(source, /disabled-items="isScenario\('disabled-wrap'\) \? \['Pending'\] : \[\]"/);
});

test('tree view examples distinguish expansion, selection, and leaf alignment', () => {
  assert.match(treeViewSource, /props\.scenario === 'multiple'/);
  assert.match(treeViewSource, /\['overview', 'settings', 'tokens'\]/);
  assert.match(treeViewSource, /v-if="expandedValue\.includes\('dashboard'\)"/);
  assert.match(treeViewSource, /3 files selected|value\.length/u);
  assert.doesNotMatch(treeViewSource, /disabledItems|unavailable/u);
});

test('calendar families use functional reusable calendar controls', () => {
  assert.match(source, /<CalendarExample[^>]+:scenario="scenario"/);
  assert.match(source, /<PickerCalendarDemo[^>]+component="date-picker"/);
  assert.match(source, /<PickerCalendarDemo[^>]+component="date-range-picker"/);
  assert.match(source, /<PickerCalendarDemo[^>]+component="date-time-picker"/);
  assert.match(source, /<PickerCalendarDemo[^>]+component="date-time-range-picker"/);
  assert.doesNotMatch(source, />Aug 22</);
  assert.doesNotMatch(pickerSource, />[‹›]</u);
});

test('period picker headings stay centered between symmetric navigation controls', () => {
  assert.match(styles, /\.catalog-picker-navigation\s*\{[^}]*grid-template-columns:\s*2\.35rem minmax\(7rem, 1fr\) 2\.35rem;/su);
  assert.match(styles, /\.catalog-picker-toolbar strong,\s*\.catalog-picker-navigation strong\s*\{[^}]*text-align:\s*center;/su);
});

test('date range picker demonstrates unavailable dates and projects their state visibly', () => {
  assert.match(source, /const unavailableBookingDates = new Set\(\['2026-08-27', '2026-08-29'\]\)/u);
  assert.match(source, /<DateRangePickerRoot[^>]+:policies="dateRangePickerPolicies"/u);
  assert.match(catalogCodeSource, /<DateRangePickerRoot[^>]+:policies="policies"/u);
  assert.match(catalogCodeSource, /const unavailableDates = new Set/u);
  assert.match(styles, /\.catalog-calendar button\[data-outside-month\]/u);
  assert.match(styles, /\.catalog-calendar button\[aria-disabled="true"\]/u);
});

test('date and time pickers group endpoint values and share one spacing rhythm', () => {
  assert.match(source, /class="catalog-date-time-control"/u);
  assert.match(source, /<DateTimeRangePickerStartDateTimeInput class="catalog-input"/u);
  assert.match(source, /<DateTimeRangePickerEndDateTimeInput class="catalog-input"/u);
  assert.doesNotMatch(source, /<DateTimeRangePickerStartDateInput/u);
  assert.doesNotMatch(source, /<DateTimeRangePickerEndTimeInput/u);
  assert.match(source, /class="catalog-range-fields catalog-range-fields--single"/u);
  assert.match(styles, /\.catalog-temporal-picker\s*\{[^}]*--catalog-temporal-gap:\s*0\.5rem;[^}]*gap:\s*var\(--catalog-temporal-gap\);/su);
  assert.match(styles, /\.catalog-temporal-picker > \.catalog-inline\s*\{[^}]*gap:\s*var\(--catalog-temporal-gap\);/su);
  assert.match(styles, /\.catalog-range-fields\s*\{[^}]*gap:\s*var\(--catalog-temporal-gap, 0\.5rem\);/su);
  assert.match(styles, /\.catalog-picker-trigger\s*\{[^}]*width:\s*2\.8rem;[^}]*height:\s*2\.8rem;[^}]*place-items:\s*center;/su);
  assert.match(styles, /\.catalog-date-time-control\s*\{[^}]*overflow:\s*hidden;/su);
  assert.match(catalogCodeSource, /class="catalog-date-time-control"/u);
  assert.match(catalogCodeSource, /DateTimeRangePickerStartDateTimeInput/u);
  assert.doesNotMatch(catalogCodeSource, /DateTimeRangePickerStartDateInput/u);
  assert.match(pickerAnatomySource, /const fieldGroups = computed/u);
  assert.match(pickerAnatomySource, /DateTimeRangePickerStartDateTimeInput/u);
  assert.match(pickerAnatomySource, /date-time-anatomy__input-group--compound/u);
  assert.match(pickerAnatomySource, /\.date-time-anatomy__content\s*\{[^}]*margin-top:\s*8px;/su);
});

test('temporal picker triggers use accessible icon buttons in previews and code', () => {
  const triggerNames = [
    'DatePickerTrigger',
    'DateRangePickerTrigger',
    'MonthPickerTrigger',
    'MonthRangePickerTrigger',
    'YearPickerTrigger',
    'YearRangePickerTrigger',
    'DateTimePickerTrigger',
    'DateTimeRangePickerTrigger',
  ];

  for (const trigger of triggerNames) {
    assert.match(source, new RegExp(`<${trigger} class="catalog-picker-trigger" aria-label="[^"]+"><CalendarDays`));
    assert.match(catalogCodeSource, new RegExp(`<${trigger} class="catalog-picker-trigger" aria-label="[^"]+">\\s*<CalendarDays`, 'u'));
  }

  assert.doesNotMatch(source, />\s*Calendar\s*</u);
  assert.doesNotMatch(catalogCodeSource, />\s*Calendar\s*</u);
});

test('paused carousel example owns real autoplay state and visible feedback', () => {
  assert.match(source, /const carouselAutoplayDelay = 3000;/);
  assert.match(source, /:autoplay="isScenario\('paused'\) \? \{ delayMs: carouselAutoplayDelay, pauseOnHover: false, pauseOnFocus: false, stopOnInteraction: false \} : false"/);
  assert.match(source, /:default-paused="isScenario\('paused'\)"/);
  assert.match(source, /<Play v-if="paused"/);
  assert.match(source, /<Pause v-else/);
  assert.doesNotMatch(source, /<CarouselPrevious[^>]*>‹<\/CarouselPrevious>/);
  assert.doesNotMatch(source, /<CarouselNext[^>]*>›<\/CarouselNext>/);
});

test('bounded carousel example uses the public boundary policy', () => {
  assert.match(source, /:policies="isScenario\('bounded'\) \? \{ wrap: false \} : \{ wrap: true \}"/);
  assert.doesNotMatch(source, /:wrap="!isScenario\('bounded'\)"/);
});

test('carousel indicators expose the actual active state visually', () => {
  assert.match(styles, /\.catalog-carousel-indicators button\[data-state="active"\]/);
  assert.match(styles, /\.catalog-carousel-indicators button\[aria-selected="true"\]/);
  assert.doesNotMatch(styles, /\.catalog-carousel-indicators button\[data-selected\]/);
  assert.match(source, /:data-autoplay="isScenario\('paused'\) \? \(paused \? 'paused' : 'running'\) : undefined"/);
  assert.match(styles, /animation: catalog-carousel-progress var\(--catalog-carousel-duration\) linear forwards/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});
