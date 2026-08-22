<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { RotateCcw } from '@lucide/vue';
import type { CheckboxValue } from '@sectile/vue/checkbox';
import CheckboxCase from './components/CheckboxCase.vue';
import CheckedControlCase from './components/CheckedControlCase.vue';
import ToggleGroupCase from './components/ToggleGroupCase.vue';
import DisclosureCase from './components/DisclosureCase.vue';
import AccordionCase from './components/AccordionCase.vue';
import TextCase from './components/TextCase.vue';
import ListboxCase from './components/ListboxCase.vue';
import RadioGroupCase from './components/RadioGroupCase.vue';
import TabsCase from './components/TabsCase.vue';
import SliderCase from './components/SliderCase.vue';
import NativeFieldCase from './components/NativeFieldCase.vue';
import SpinButtonCase from './components/SpinButtonCase.vue';
import PaginationCase from './components/PaginationCase.vue';
import CatalogCase from './components/CatalogCase.vue';
import { catalogScenarios } from './catalog-scenarios.js';

const componentIDs = [
  'checkbox', 'checkbox-group', 'switch', 'toggle-button', 'toggle-group', 'listbox', 'radio-group', 'rating',
  'select', 'combobox', 'tabs', 'stepper', 'pagination', 'toolbar', 'menu', 'menubar', 'menu-button',
  'disclosure', 'accordion', 'dialog', 'alert-dialog', 'tooltip', 'carousel', 'feed', 'calendar',
  'slider', 'multi-thumb-slider', 'window-splitter', 'text', 'tags-input', 'pin-input', 'spin-button',
  'number-field', 'quantity-field', 'date-field', 'time-field', 'date-time-field', 'date-picker',
  'date-range-picker', 'date-time-picker', 'date-time-range-picker', 'grid', 'tree-view', 'tree-grid',
] as const;
type ComponentID = typeof componentIDs[number];

interface CheckboxScenario {
  readonly id: string;
  readonly title: string;
  readonly label: string;
  readonly helper: string;
  readonly description: string;
  readonly initialValue: CheckboxValue;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly asChild?: boolean;
}

interface CheckedControlScenario {
  readonly id: string;
  readonly kind: 'switch' | 'toggle-button';
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly initialValue: boolean;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
}

interface DisclosureScenario {
  readonly id: string;
  readonly title: string;
  readonly label: string;
  readonly description: string;
  readonly initialValue: boolean;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
}

const activeComponent = ref<ComponentID>('checkbox');
const resetEpoch = ref(0);
const componentLabel = computed(() => ({
  checkbox: 'Checkbox',
  switch: 'Switch',
  'toggle-button': 'Toggle Button',
  'toggle-group': 'Toggle Group',
  listbox: 'Listbox',
  'radio-group': 'Radio Group',
  tabs: 'Tabs',
  slider: 'Slider',
  disclosure: 'Disclosure',
  accordion: 'Accordion',
  text: 'Text',
  'spin-button': 'Spin Button',
  'number-field': 'Number Field',
  'date-field': 'Date Field',
  'time-field': 'Time Field',
  'date-time-field': 'Date Time Field',
  'checkbox-group': 'Checkbox Group', rating: 'Rating', select: 'Select', combobox: 'Combobox',
  stepper: 'Stepper', pagination: 'Pagination', toolbar: 'Toolbar', menu: 'Menu', menubar: 'Menubar', 'menu-button': 'Menu Button',
  dialog: 'Dialog', 'alert-dialog': 'Alert Dialog', tooltip: 'Tooltip', carousel: 'Carousel', feed: 'Feed', calendar: 'Calendar',
  'multi-thumb-slider': 'Multi Thumb Slider', 'window-splitter': 'Window Splitter', 'tags-input': 'Tags Input', 'pin-input': 'PIN Input',
  'quantity-field': 'Quantity Field', 'date-picker': 'Date Picker', 'date-range-picker': 'Date Range Picker',
  'date-time-picker': 'Date Time Picker', 'date-time-range-picker': 'Date Time Range Picker', grid: 'Grid', 'tree-view': 'Tree View', 'tree-grid': 'Tree Grid',
})[activeComponent.value]);

const checkboxScenarios: readonly CheckboxScenario[] = [
  { id: 'indeterminate', title: 'Partial group selection', label: 'Select deployment channels', helper: '2 of 3 channels selected', description: 'Indeterminate represents a parent whose children are only partly selected.', initialValue: 'indeterminate' },
  { id: 'binary', title: 'Optional feature', label: 'Include analytics', helper: 'Add workspace usage reports', description: 'Uncontrolled ownership keeps local state inside CheckboxRoot.', initialValue: false },
  { id: 'controlled', title: 'Controlled agreement', label: 'Accept analytics terms', helper: 'State is owned through v-model', description: 'Controlled ownership proposes changes and follows the parent model.', initialValue: true, controlled: true },
  { id: 'readonly', title: 'Read-only review', label: 'Production access approved', helper: 'Focusable, but immutable', description: 'Read-only preserves inspection and focus while rejecting value changes.', initialValue: true, readonly: true },
  { id: 'disabled', title: 'Unavailable policy', label: 'Enable regional replication', helper: 'Unavailable for this plan', description: 'Disabled removes the control from focus and pointer interaction.', initialValue: false, disabled: true },
  { id: 'as-child', title: 'Consumer element', label: 'Use custom button markup', helper: 'Semantics merge through asChild', description: 'The consumer owns the element while Sectile supplies behavior and attributes.', initialValue: false, asChild: true },
];

const checkedControlScenarios: readonly CheckedControlScenario[] = [
  { id: 'switch-local', kind: 'switch', title: 'Immediate setting', label: 'Deployment notifications', description: 'Switch changes a persistent setting immediately and keeps its thumb mounted.', initialValue: false },
  { id: 'switch-controlled', kind: 'switch', title: 'Controlled setting', label: 'Automatic updates', description: 'v-model owns the value while DOM projection supplies form and switch semantics.', initialValue: true, controlled: true },
  { id: 'switch-readonly', kind: 'switch', title: 'Read-only setting', label: 'Organization policy', description: 'The setting remains focusable for review but cannot be changed.', initialValue: true, readonly: true },
  { id: 'toggle-local', kind: 'toggle-button', title: 'Formatting action', label: 'Bold', description: 'Toggle Button keeps an action pressed without pretending to be a form field.', initialValue: false },
  { id: 'toggle-controlled', kind: 'toggle-button', title: 'Controlled tool', label: 'Watch changes', description: 'The parent owns pressed state through the default v-model contract.', initialValue: true, controlled: true },
  { id: 'toggle-disabled', kind: 'toggle-button', title: 'Unavailable action', label: 'Pin release', description: 'Disabled uses native button behavior and leaves the tab sequence.', initialValue: false, disabled: true },
];

const disclosureScenarios: readonly DisclosureScenario[] = [
  { id: 'closed', title: 'Initially closed', label: 'Advanced deployment options', description: 'Trigger and content stay linked through generated native IDs.', initialValue: false },
  { id: 'open', title: 'Initially open', label: 'Release safeguards', description: 'Content remains mounted and uses the native hidden attribute when closed.', initialValue: true },
  { id: 'controlled', title: 'Controlled disclosure', label: 'Audit details', description: 'v-model owns open state without exposing core policy objects.', initialValue: false, controlled: true },
  { id: 'readonly', title: 'Read-only disclosure', label: 'Locked compliance notes', description: 'Focus remains available while state changes are rejected.', initialValue: true, readonly: true },
];

const paginationScenarios = [
  { variant: 'standard', title: 'Result pages', description: 'Numbered pages, edge pages, and boundary controls cover the common result-list pattern.', total: 240, initialPage: 4, initialItemsPerPage: 20 },
  { variant: 'compact', title: 'Compact navigation', description: 'Previous and next controls keep pagination usable when horizontal space is limited.', total: 64, initialPage: 3, initialItemsPerPage: 8, siblingCount: 0, showEdges: false, boundaryControls: false },
  { variant: 'large', title: 'Large result set', description: 'Edge pages and ellipses keep one hundred pages scannable without rendering every page.', total: 2500, initialPage: 48, initialItemsPerPage: 25, siblingCount: 2 },
  { variant: 'page-size', title: 'Adjustable page size', description: 'The parent controls both page and page size while the range summary stays synchronized.', total: 347, initialPage: 3, initialItemsPerPage: 25, adjustable: true },
  { variant: 'controlled', title: 'Controlled page', description: 'External controls and pagination buttons update the same parent-owned page value.', total: 200, initialPage: 10, initialItemsPerPage: 10, controlled: true },
  { variant: 'readonly', title: 'Read-only review', description: 'Page controls remain focusable for inspection while every navigation request is rejected.', total: 120, initialPage: 5, initialItemsPerPage: 10, readonly: true },
  { variant: 'disabled', title: 'Disabled pagination', description: 'Unavailable result navigation leaves the tab sequence and ignores pointer interaction.', total: 120, initialPage: 5, initialItemsPerPage: 10, disabled: true },
  { variant: 'empty', title: 'Empty result set', description: 'A zero-result collection keeps its summary understandable and all boundary movement unavailable.', total: 0, initialPage: 1, initialItemsPerPage: 20 },
] as const;

function isComponentID(value: string): value is ComponentID {
  return (componentIDs as readonly string[]).includes(value);
}

function readHash(): void {
  const value = window.location.hash.slice(1);
  if (isComponentID(value)) activeComponent.value = value;
}

function selectComponent(id: ComponentID): void {
  activeComponent.value = id;
  window.history.replaceState(null, '', `#${id}`);
}

onMounted(() => {
  readHash();
  window.addEventListener('hashchange', readHash);
});
onBeforeUnmount(() => window.removeEventListener('hashchange', readHash));
</script>

<template>
  <main class="shell">
    <aside class="component-rail">
      <div class="rail-heading">
        <span class="rail-mark" aria-hidden="true" />
        <strong>Components</strong>
      </div>
      <nav class="demo-nav" aria-label="Component categories">
        <section class="demo-nav-group" :data-active="['checkbox', 'switch', 'toggle-button', 'toggle-group', 'listbox', 'radio-group', 'slider'].includes(activeComponent)">
          <h2 class="demo-nav-heading">
            <span>Selection</span>
            <span class="demo-nav-count" aria-label="7 components">7</span>
          </h2>
          <div class="demo-nav-links">
            <a href="#checkbox" :aria-current="activeComponent === 'checkbox' ? 'page' : undefined" @click.prevent="selectComponent('checkbox')">Checkbox</a>
            <a href="#switch" :aria-current="activeComponent === 'switch' ? 'page' : undefined" @click.prevent="selectComponent('switch')">Switch</a>
            <a href="#toggle-button" :aria-current="activeComponent === 'toggle-button' ? 'page' : undefined" @click.prevent="selectComponent('toggle-button')">Toggle Button</a>
            <a href="#toggle-group" :aria-current="activeComponent === 'toggle-group' ? 'page' : undefined" @click.prevent="selectComponent('toggle-group')">Toggle Group</a>
            <a href="#listbox" :aria-current="activeComponent === 'listbox' ? 'page' : undefined" @click.prevent="selectComponent('listbox')">Listbox</a>
            <a href="#radio-group" :aria-current="activeComponent === 'radio-group' ? 'page' : undefined" @click.prevent="selectComponent('radio-group')">Radio Group</a>
            <a href="#slider" :aria-current="activeComponent === 'slider' ? 'page' : undefined" @click.prevent="selectComponent('slider')">Slider</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['disclosure', 'accordion', 'tabs'].includes(activeComponent)">
          <h2 class="demo-nav-heading">
            <span>Expansion</span>
            <span class="demo-nav-count" aria-label="3 components">3</span>
          </h2>
          <div class="demo-nav-links">
            <a href="#disclosure" :aria-current="activeComponent === 'disclosure' ? 'page' : undefined" @click.prevent="selectComponent('disclosure')">Disclosure</a>
            <a href="#accordion" :aria-current="activeComponent === 'accordion' ? 'page' : undefined" @click.prevent="selectComponent('accordion')">Accordion</a>
            <a href="#tabs" :aria-current="activeComponent === 'tabs' ? 'page' : undefined" @click.prevent="selectComponent('tabs')">Tabs</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['text', 'spin-button', 'number-field', 'date-field', 'time-field', 'date-time-field'].includes(activeComponent)">
          <h2 class="demo-nav-heading">
            <span>Editing</span>
            <span class="demo-nav-count" aria-label="6 components">6</span>
          </h2>
          <div class="demo-nav-links">
            <a href="#text" :aria-current="activeComponent === 'text' ? 'page' : undefined" @click.prevent="selectComponent('text')">Text</a>
            <a href="#spin-button" :aria-current="activeComponent === 'spin-button' ? 'page' : undefined" @click.prevent="selectComponent('spin-button')">Spin Button</a>
            <a href="#number-field" :aria-current="activeComponent === 'number-field' ? 'page' : undefined" @click.prevent="selectComponent('number-field')">Number Field</a>
            <a href="#date-field" :aria-current="activeComponent === 'date-field' ? 'page' : undefined" @click.prevent="selectComponent('date-field')">Date Field</a>
            <a href="#time-field" :aria-current="activeComponent === 'time-field' ? 'page' : undefined" @click.prevent="selectComponent('time-field')">Time Field</a>
            <a href="#date-time-field" :aria-current="activeComponent === 'date-time-field' ? 'page' : undefined" @click.prevent="selectComponent('date-time-field')">Date Time Field</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['checkbox-group', 'select', 'combobox', 'tags-input', 'pin-input', 'grid', 'tree-view', 'tree-grid'].includes(activeComponent)">
          <h2 class="demo-nav-heading"><span>Collections</span><span class="demo-nav-count" aria-label="8 components">8</span></h2>
          <div class="demo-nav-links">
            <a v-for="id in ['checkbox-group', 'select', 'combobox', 'tags-input', 'pin-input', 'grid', 'tree-view', 'tree-grid'] as const" :key="id" :href="`#${id}`" :aria-current="activeComponent === id ? 'page' : undefined" @click.prevent="selectComponent(id)">{{ ({ 'checkbox-group': 'Checkbox Group', select: 'Select', combobox: 'Combobox', 'tags-input': 'Tags Input', 'pin-input': 'PIN Input', grid: 'Grid', 'tree-view': 'Tree View', 'tree-grid': 'Tree Grid' } as const)[id] }}</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['stepper', 'pagination', 'toolbar', 'menu', 'menubar', 'menu-button', 'carousel', 'feed', 'calendar'].includes(activeComponent)">
          <h2 class="demo-nav-heading"><span>Navigation</span><span class="demo-nav-count" aria-label="9 components">9</span></h2>
          <div class="demo-nav-links">
            <a v-for="id in ['stepper', 'pagination', 'toolbar', 'menu', 'menubar', 'menu-button', 'carousel', 'feed', 'calendar'] as const" :key="id" :href="`#${id}`" :aria-current="activeComponent === id ? 'page' : undefined" @click.prevent="selectComponent(id)">{{ ({ stepper: 'Stepper', pagination: 'Pagination', toolbar: 'Toolbar', menu: 'Menu', menubar: 'Menubar', 'menu-button': 'Menu Button', carousel: 'Carousel', feed: 'Feed', calendar: 'Calendar' } as const)[id] }}</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['rating', 'multi-thumb-slider', 'window-splitter', 'quantity-field', 'date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker'].includes(activeComponent)">
          <h2 class="demo-nav-heading"><span>Value &amp; Date</span><span class="demo-nav-count" aria-label="8 components">8</span></h2>
          <div class="demo-nav-links">
            <a v-for="id in ['rating', 'multi-thumb-slider', 'window-splitter', 'quantity-field', 'date-picker', 'date-range-picker', 'date-time-picker', 'date-time-range-picker'] as const" :key="id" :href="`#${id}`" :aria-current="activeComponent === id ? 'page' : undefined" @click.prevent="selectComponent(id)">{{ ({ rating: 'Rating', 'multi-thumb-slider': 'Multi Thumb Slider', 'window-splitter': 'Window Splitter', 'quantity-field': 'Quantity Field', 'date-picker': 'Date Picker', 'date-range-picker': 'Date Range Picker', 'date-time-picker': 'Date Time Picker', 'date-time-range-picker': 'Date Time Range Picker' } as const)[id] }}</a>
          </div>
        </section>
        <section class="demo-nav-group" :data-active="['dialog', 'alert-dialog', 'tooltip'].includes(activeComponent)">
          <h2 class="demo-nav-heading"><span>Overlays</span><span class="demo-nav-count" aria-label="3 components">3</span></h2>
          <div class="demo-nav-links">
            <a href="#dialog" :aria-current="activeComponent === 'dialog' ? 'page' : undefined" @click.prevent="selectComponent('dialog')">Dialog</a>
            <a href="#alert-dialog" :aria-current="activeComponent === 'alert-dialog' ? 'page' : undefined" @click.prevent="selectComponent('alert-dialog')">Alert Dialog</a>
            <a href="#tooltip" :aria-current="activeComponent === 'tooltip' ? 'page' : undefined" @click.prevent="selectComponent('tooltip')">Tooltip</a>
          </div>
        </section>
      </nav>
    </aside>

    <section :id="activeComponent" class="playground-content">
      <header class="hero">
        <div>
          <h1>{{ componentLabel }}</h1>
          <p class="lede">Headless Vue composition over DOM-native behavior and Sectile state semantics.</p>
        </div>
      </header>

      <section class="shortcuts" aria-label="Demo controls">
        <div class="shortcut-list">
          <span><kbd>Click</kbd> interact</span>
          <span><kbd>Tab</kbd> move focus</span>
        </div>
        <button type="button" class="reset-button secondary button-with-icon" :aria-label="`Reset ${componentLabel} demos`" :title="`Reset ${componentLabel} demos`" @click="resetEpoch += 1">
          <RotateCcw :size="13" aria-hidden="true" />
          Reset
        </button>
      </section>

      <div v-if="activeComponent === 'checkbox'" class="workspace" data-demo="checkbox">
        <CheckboxCase
          v-for="scenario in checkboxScenarios"
          :key="`${scenario.id}-${resetEpoch}`"
          :case-id="scenario.id"
          :title="scenario.title"
          :label="scenario.label"
          :helper="scenario.helper"
          :description="scenario.description"
          :initial-value="scenario.initialValue"
          :controlled="scenario.controlled ?? false"
          :disabled="scenario.disabled ?? false"
          :readonly="scenario.readonly ?? false"
          :as-child="scenario.asChild ?? false"
        />
      </div>

      <div v-else-if="activeComponent === 'disclosure'" class="workspace" data-demo="disclosure">
        <DisclosureCase v-for="scenario in disclosureScenarios" :key="`${scenario.id}-${resetEpoch}`" v-bind="scenario" />
      </div>

      <div v-else-if="activeComponent === 'accordion'" class="workspace" data-demo="accordion">
        <AccordionCase
          :key="`single-${resetEpoch}`"
          title="Single collapsible"
          description="One section stays open at a time and the active section may collapse."
          type="single"
          initial-value="deployments"
        />
        <AccordionCase
          :key="`multiple-${resetEpoch}`"
          title="Multiple expansion"
          description="Independent sections can remain open together."
          type="multiple"
          :initial-value="['general', 'deployments']"
          :controlled="true"
        />
      </div>

      <div v-else-if="activeComponent === 'text'" class="workspace" data-demo="text">
        <TextCase
          :key="`text-${resetEpoch}`"
          title="Native text editing"
          description="Browser-native selection, word deletion, and IME composition feed Sectile state."
          initial-value="Sectile"
        />
        <TextCase
          :key="`textarea-${resetEpoch}`"
          title="Controlled multiline text"
          description="The same controller works through a native textarea and v-model."
          :controlled="true"
          :multiline="true"
        />
        <TextCase
          :key="`readonly-${resetEpoch}`"
          title="Read-only text"
          description="Selection and copy remain native while mutation is blocked."
          initial-value="Approved release note"
          :readonly="true"
        />
      </div>

      <div v-else-if="activeComponent === 'listbox'" class="workspace" data-demo="listbox">
        <ListboxCase
          :key="`single-${resetEpoch}`"
          title="Single selection"
          description="Arrow keys move focus, typeahead finds labels, and one option is selected at a time."
        />
        <ListboxCase
          :key="`multiple-${resetEpoch}`"
          title="Multiple selection"
          description="Space or click toggles independent options while disabled choices stay unavailable."
          :multiple="true"
          :controlled="true"
        />
        <ListboxCase
          :key="`readonly-${resetEpoch}`"
          title="Read-only selection"
          description="The selected value can be inspected and focused without allowing mutation."
          :readonly="true"
        />
      </div>

      <div v-else-if="activeComponent === 'radio-group'" class="workspace" data-demo="radio-group">
        <RadioGroupCase :key="`radio-${resetEpoch}`" />
        <RadioGroupCase :key="`radio-controlled-${resetEpoch}`" :controlled="true" />
        <RadioGroupCase :key="`radio-readonly-${resetEpoch}`" :readonly="true" />
      </div>

      <div v-else-if="activeComponent === 'toggle-group'" class="workspace" data-demo="toggle-group">
        <ToggleGroupCase :key="`toggle-single-${resetEpoch}`" title="Text alignment" description="One pressed action at a time; press the active item again to clear it." />
        <ToggleGroupCase :key="`toggle-multiple-${resetEpoch}`" title="Text formatting" description="Independent actions can remain pressed together." :multiple="true" />
        <ToggleGroupCase :key="`toggle-controlled-${resetEpoch}`" title="Controlled formatting" description="The parent owns the pressed value array." :multiple="true" :controlled="true" />
      </div>

      <div v-else-if="activeComponent === 'tabs'" class="workspace" data-demo="tabs">
        <TabsCase :key="`tabs-auto-${resetEpoch}`" />
        <TabsCase :key="`tabs-manual-${resetEpoch}`" :manual="true" :controlled="true" />
      </div>

      <div v-else-if="activeComponent === 'slider'" class="workspace" data-demo="slider">
        <SliderCase :key="`slider-${resetEpoch}`" />
      </div>

      <div v-else-if="activeComponent === 'number-field'" class="workspace" data-demo="number-field">
        <NativeFieldCase :key="`number-${resetEpoch}`" kind="number-field" title="Expression input" description="Type calculator-style input such as 50-20% and press Enter to commit an exact decimal." initial-value="40" />
        <NativeFieldCase :key="`number-controlled-${resetEpoch}`" kind="number-field" title="Controlled decimal" description="The parent owns the committed exact decimal string." initial-value="12.50" :controlled="true" />
      </div>

      <div v-else-if="activeComponent === 'spin-button'" class="workspace" data-demo="spin-button">
        <SpinButtonCase :key="`spin-button-${resetEpoch}`" />
      </div>

      <div v-else-if="activeComponent === 'pagination'" class="workspace" data-demo="pagination">
        <PaginationCase
          v-for="scenario in paginationScenarios"
          :key="`${scenario.variant}-${resetEpoch}`"
          v-bind="scenario"
        />
      </div>

      <div v-else-if="activeComponent === 'date-field'" class="workspace" data-demo="date-field">
        <NativeFieldCase :key="`date-${resetEpoch}`" kind="date-field" title="Civil date" description="A timezone-free Gregorian date with caret-segment adjustment." :initial-value="{ year: 2026, month: 8, day: 22 }" />
      </div>

      <div v-else-if="activeComponent === 'time-field'" class="workspace" data-demo="time-field">
        <NativeFieldCase :key="`time-${resetEpoch}`" kind="time-field" title="Wall-clock time" description="A 24-hour time value without a timezone or host Date object." :initial-value="{ hour: 9, minute: 30, second: 0, millisecond: 0 }" />
      </div>

      <div v-else-if="activeComponent === 'date-time-field'" class="workspace" data-demo="date-time-field">
        <NativeFieldCase :key="`date-time-${resetEpoch}`" kind="date-time-field" title="Civil date and time" description="Date and wall-clock time commit atomically while remaining timezone-free." :initial-value="{ date: { year: 2026, month: 8, day: 22 }, time: { hour: 9, minute: 30, second: 0, millisecond: 0 } }" />
      </div>

      <div v-else-if="activeComponent === 'switch' || activeComponent === 'toggle-button'" class="workspace" :data-demo="activeComponent">
        <CheckedControlCase
          v-for="scenario in checkedControlScenarios.filter((entry) => entry.kind === activeComponent)"
          :key="`${scenario.id}-${resetEpoch}`"
          v-bind="scenario"
        />
      </div>

      <div v-else class="workspace" :data-demo="activeComponent">
        <CatalogCase
          v-for="scenario in catalogScenarios[activeComponent]"
          :key="`${scenario.id}-${resetEpoch}`"
          :component="activeComponent"
          :title="scenario.title"
          :description="scenario.description"
          :variant="scenario.variant"
        />
      </div>
    </section>
  </main>
</template>
