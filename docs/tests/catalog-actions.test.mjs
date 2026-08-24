import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../.vitepress/theme/components/CatalogCase.vue', import.meta.url), 'utf8');
const menubarSource = await readFile(new URL('../.vitepress/theme/components/MenubarExample.vue', import.meta.url), 'utf8');
const pickerSource = await readFile(new URL('../.vitepress/theme/components/PickerCalendarDemo.vue', import.meta.url), 'utf8');
const styles = await readFile(new URL('../.vitepress/theme/component-examples.css', import.meta.url), 'utf8');

test('host-owned demo actions always update visible example state', () => {
  assert.match(source, /@request-window="loadFeedWindow"/);
  assert.match(source, /:revision="feedRevision"/);
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

test('disabled grid examples only reference cells present in their row model', () => {
  assert.match(source, /isScenario\('editable', 'controlled', 'disabled-wrap'\)/);
  assert.match(source, /\['Preview', 'Pending', 'next'\]/);
  assert.match(source, /disabled-items="isScenario\('disabled-wrap'\) \? \['Pending'\] : \[\]"/);
});

test('tree view examples distinguish expansion, selection, and leaf alignment', () => {
  assert.match(source, /const treeSelection = computed/);
  assert.match(source, /:default-value="treeSelection"/);
  assert.match(source, /class="catalog-tree-spacer"/);
  assert.match(source, /class="catalog-tree-selected-icon"/);
  assert.doesNotMatch(source, /<Circle/);
  assert.doesNotMatch(source, /:selection-mode=/);
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
