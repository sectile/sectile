<script setup lang="ts">
import { computed, markRaw, type Component } from 'vue';
import { createCalculatorExpression, type NumberFieldPolicies } from '@sectile/core/number-field';
import { numberFieldExampleConfig } from '../number-field-examples.js';
import type { PinInputExampleOptions } from '../pin-input-example-options.js';
import AccordionCase from './AccordionCase.vue';
import CascadeSelectCase from './CascadeSelectCase.vue';
import CatalogCase from './CatalogCase.vue';
import CheckedControlCase from './CheckedControlCase.vue';
import ColorPickerCase from './ColorPickerCase.vue';
import DateRangeFieldCase from './DateRangeFieldCase.vue';
import DisclosureCase from './DisclosureCase.vue';
import EditableCase from './EditableCase.vue';
import FeedCase from './FeedCase.vue';
import FormCase from './FormCase.vue';
import ListboxCase from './ListboxCase.vue';
import MultiThumbSliderCase from './MultiThumbSliderCase.vue';
import NativeFieldCase from './NativeFieldCase.vue';
import PaginationCase from './PaginationCase.vue';
import PopoverCase from './PopoverCase.vue';
import RadioGroupCase from './RadioGroupCase.vue';
import SliderCase from './SliderCase.vue';
import SpinButtonCase from './SpinButtonCase.vue';
import TabsCase from './TabsCase.vue';
import TextCase from './TextCase.vue';
import TimeRangeFieldCase from './TimeRangeFieldCase.vue';
import TimerCase from './TimerCase.vue';
import ToastCase from './ToastCase.vue';
import ToggleGroupCase from './ToggleGroupCase.vue';
import TreeGridCase from './TreeGridCase.vue';
import TreeViewCase from './TreeViewCase.vue';
import WindowSplitterCase from './WindowSplitterCase.vue';

const props = withDefaults(defineProps<{
  readonly component: string;
  readonly scenario: string;
  readonly title: string;
  readonly description: string;
  readonly index?: number;
  readonly pinInputOptions?: PinInputExampleOptions | undefined;
  readonly preview?: boolean;
}>(), { index: 0, preview: false });

interface ResolvedExample {
  readonly component: Component;
  readonly props: Readonly<Record<string, unknown>>;
}

const date = Object.freeze({ year: 2026, month: 8, day: 22 });
const septemberRange = Object.freeze({
  start: Object.freeze({ year: 2026, month: 9, day: 8 }),
  end: Object.freeze({ year: 2026, month: 9, day: 18 }),
});
const dateRange = Object.freeze({ start: date, end: Object.freeze({ year: 2026, month: 8, day: 25 }) });
const time = Object.freeze({ hour: 9, minute: 30, second: 0, millisecond: 0 });
const timeRange = Object.freeze({ start: time, end: Object.freeze({ hour: 17, minute: 45, second: 0, millisecond: 0 }) });
const dateTime = Object.freeze({ date, time });
const lateDateTime = Object.freeze({
  date,
  time: Object.freeze({ hour: 23, minute: 45, second: 0, millisecond: 0 }),
});

function specialized(component: Component, options: Readonly<Record<string, unknown>> = {}): ResolvedExample {
  return { component: markRaw(component), props: { title: props.title, description: props.description, ...options } };
}

function resolveExample(): ResolvedExample {
  const controlled = props.scenario.includes('controlled');
  const initialOn = ['on', 'open', 'initially-open'].includes(props.scenario) || controlled;
  switch (props.component) {
    case 'checkbox': return specialized(CheckedControlCase, { kind: 'checkbox', label: 'Include analytics', initialValue: props.scenario === 'mixed' ? 'indeterminate' : controlled, controlled, preview: props.preview });
    case 'switch': return specialized(CheckedControlCase, { kind: 'switch', label: 'Deployment notifications', initialValue: initialOn, controlled, preview: props.preview });
    case 'toggle-button': return specialized(CheckedControlCase, { kind: 'toggle-button', label: props.scenario === 'alert' ? 'Watch alerts' : 'Bold', initialValue: initialOn, controlled, preview: props.preview });
    case 'accordion': return specialized(AccordionCase, { type: props.scenario === 'multiple' ? 'multiple' : 'single', initialValue: props.preview ? 'general' : props.scenario === 'required' ? 'deployments' : '', collapsible: props.scenario !== 'required', controlled });
    case 'disclosure': return specialized(DisclosureCase, { label: 'Advanced deployment options', initialValue: initialOn, controlled, preview: props.preview });
    case 'text': return specialized(TextCase, { initialValue: props.scenario === 'unicode-selection' ? '한글과 emoji 👋' : 'Sectile', multiline: props.scenario === 'multiline', controlled });
    case 'editable': return specialized(EditableCase, { initialValue: 'release-candidate', validated: props.scenario === 'validated', controlled });
    case 'form': return specialized(FormCase, { scenario: props.scenario });
    case 'feed': return specialized(FeedCase, { scenario: props.scenario });
    case 'tree-grid': return specialized(TreeGridCase, { scenario: props.scenario });
    case 'tree-view': return specialized(TreeViewCase, { scenario: props.scenario });
    case 'listbox': return specialized(ListboxCase, { multiple: props.scenario === 'multiple', controlled });
    case 'cascade-select': return specialized(CascadeSelectCase, { initialValue: props.scenario === 'controlled' ? 'paris' : 'seoul', disabledItems: props.scenario === 'disabled' ? ['jp', 'tokyo'] : [], controlled, preview: props.preview });
    case 'radio-group': return specialized(RadioGroupCase, { controlled });
    case 'toggle-group': return specialized(ToggleGroupCase, { multiple: props.scenario === 'multiple', controlled });
    case 'popover': return specialized(PopoverCase, { side: props.scenario === 'collision' ? 'right' : 'bottom', controlled, preview: props.preview });
    case 'toast': return specialized(ToastCase, { persistent: props.scenario === 'persistent', maxVisible: props.scenario === 'limited' ? 2 : 3, preview: props.preview });
    case 'timer': return specialized(TimerCase, { countdown: props.scenario === 'countdown', startMs: props.scenario === 'countdown' ? 10_000 : 0, targetMs: props.scenario === 'target' ? 15_000 : undefined });
    case 'color-picker': return specialized(ColorPickerCase, { initialValue: props.scenario === 'alpha' ? '#26c6a080' : '#5b6df6', alpha: props.scenario === 'alpha', controlled, readonly: props.scenario === 'readonly' });
    case 'tabs': return specialized(TabsCase, { manual: props.scenario === 'manual', controlled });
    case 'slider': return specialized(SliderCase);
    case 'multi-thumb-slider': return specialized(MultiThumbSliderCase, { scenario: props.scenario });
    case 'spin-button': return specialized(SpinButtonCase, { scenario: props.scenario });
    case 'number-field': {
      const config = numberFieldExampleConfig(props.scenario);
      return specialized(NativeFieldCase, {
        kind: 'number-field',
        initialValue: config.initialValue,
        policies: numberFieldPolicies(config),
        controlled: config.controlled,
      });
    }
    case 'date-field': return specialized(NativeFieldCase, {
      kind: 'date-field', initialValue: date, controlled,
      policies: props.scenario === 'bounded' ? { min: { year: 2026, month: 8, day: 1 }, max: { year: 2026, month: 8, day: 31 } } : undefined,
    });
    case 'time-field': return specialized(NativeFieldCase, {
      kind: 'time-field', initialValue: time, controlled,
      policies: props.scenario === 'stepped' ? { step: { minute: 15 } } : undefined,
    });
    case 'date-time-field': return specialized(NativeFieldCase, {
      kind: 'date-time-field', initialValue: props.scenario === 'cross-midnight' ? lateDateTime : dateTime, controlled,
      policies: props.scenario === 'cross-midnight' ? { step: { minute: 15 } } : undefined,
    });
    case 'date-range-field': return specialized(DateRangeFieldCase, { initialValue: props.scenario === 'bounded' ? septemberRange : dateRange, bounded: props.scenario === 'bounded', controlled });
    case 'time-range-field': return specialized(TimeRangeFieldCase, { initialValue: timeRange, stepped: props.scenario === 'stepped', controlled });
    case 'window-splitter': return specialized(WindowSplitterCase, { scenario: props.scenario });
    case 'pagination': return specialized(PaginationCase, paginationProps(controlled));
    default: return specialized(CatalogCase, {
      component: props.component,
      scenario: props.scenario,
      preview: props.preview,
      ...(props.component === 'pin-input' ? { pinInputOptions: props.pinInputOptions } : {}),
    });
  }
}

function numberFieldPolicies(config: ReturnType<typeof numberFieldExampleConfig>): NumberFieldPolicies {
  const calculator = config.calculator
    ? createCalculatorExpression({ precision: 12, rounding: 'half-even' })
    : null;
  return Object.freeze({
    ...(calculator === null ? {} : { evaluator: calculator }),
    ...(config.min === undefined ? {} : { min: config.min }),
    ...(config.max === undefined ? {} : { max: config.max }),
  });
}

function paginationProps(controlled: boolean): Readonly<Record<string, unknown>> {
  if (props.scenario === 'compact') return { variant: 'compact', total: 64, initialPage: 3, initialItemsPerPage: 8, siblingCount: 0, showEdges: false, boundaryControls: false };
  if (props.scenario === 'long-range') return { variant: 'large', total: 2500, initialPage: 48, initialItemsPerPage: 25, siblingCount: 2 };
  if (props.scenario === 'page-size') return { variant: 'page-size', total: 347, initialPage: 3, initialItemsPerPage: 25, adjustable: true };
  if (props.scenario === 'pages-only') return { variant: 'standard', total: 240, initialPage: 5, initialItemsPerPage: 20, boundaryControls: false };
  return { variant: 'standard', total: 200, initialPage: 10, initialItemsPerPage: 10, controlled };
}

const example = computed(resolveExample);
</script>

<template>
  <div
    class="component-example-stage"
    :data-component="component"
    :data-preview="preview ? 'true' : undefined"
  >
    <component :is="example.component" :key="`${component}:${scenario}:${preview}`" v-bind="example.props" />
  </div>
</template>
