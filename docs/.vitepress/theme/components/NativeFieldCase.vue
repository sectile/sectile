<script setup lang="ts">
import { CalendarDays, Clock3, SlidersHorizontal } from '@lucide/vue';
import { computed, ref, type Component } from 'vue';
import { DateField, type DateValue } from '@sectile/vue/date-field';
import { DateTimeField, type DateTimeValue } from '@sectile/vue/date-time-field';
import { NumberField, type NumberFieldProps } from '@sectile/vue/number-field';
import { TimeField, type TimeValue } from '@sectile/vue/time-field';
import DemoCard from './DemoCard.vue';
import {
  formatDemoDate, formatDemoDateTime, formatDemoTime,
  type DemoDateTimeValue, type DemoDateValue, type DemoTimeValue,
} from '../temporal-demo-format.js';
import type { EventEntry } from '../types.js';

type FieldKind = 'number-field' | 'date-field' | 'time-field' | 'date-time-field';
type FieldValue = string | DateValue | TimeValue | DateTimeValue | null;

const props = defineProps<{
  readonly kind: FieldKind;
  readonly title: string;
  readonly description: string;
  readonly initialValue: FieldValue;
  readonly policies?: NumberFieldProps['policies'] | Readonly<Record<string, unknown>>;
  readonly controlled?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
}>();

const component = computed<Component>(() => ({
  'number-field': NumberField,
  'date-field': DateField,
  'time-field': TimeField,
  'date-time-field': DateTimeField,
})[props.kind] as Component);
const value = ref<FieldValue>(props.initialValue);
const ownershipProps = computed(() => props.controlled
  ? { modelValue: value.value }
  : { defaultValue: props.initialValue });
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const interaction = computed<'enabled' | 'readonly' | 'disabled'>(() => (
  props.disabled ? 'disabled' : props.readonly ? 'readonly' : 'enabled'
));
const state = computed<Readonly<Record<string, unknown>>>(() => ({
  value: value.value,
  ownership: props.controlled ? 'controlled' : 'uncontrolled',
  interaction: interaction.value,
}));
const temporal = computed(() => props.kind !== 'number-field');
const displayValue = computed(() => {
  if (props.kind === 'date-field') return formatDemoDate(value.value as DemoDateValue | null);
  if (props.kind === 'time-field') return formatDemoTime(value.value as DemoTimeValue | null);
  if (props.kind === 'date-time-field') return formatDemoDateTime(value.value as DemoDateTimeValue | null);
  return value.value === null ? 'No value' : String(value.value);
});
const summaryLabel = computed(() => ({
  'date-field': 'Selected date',
  'time-field': 'Selected time',
  'date-time-field': 'Scheduled for',
  'number-field': 'Committed value',
})[props.kind]);
const fieldIcon = computed(() => props.kind === 'date-field'
  ? CalendarDays
  : props.kind === 'time-field' || props.kind === 'date-time-field'
    ? Clock3
    : SlidersHorizontal);
const sourceCode = computed(() => `<script setup lang="ts">
import { ${component.value.name?.replace('Sectile', '') ?? 'Field'} } from '@sectile/vue/${props.kind}';
<\/script>

<template>
  <${component.value.name?.replace('Sectile', '') ?? 'Field'}${props.controlled ? ' v-model="value"' : ' :default-value="initialValue"'}${props.kind === 'number-field' ? '' : ' native'} />
</template>`);

function update(next: FieldValue): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{
    revision: revision.value,
    event: 'update:modelValue',
    accepted: true,
    effects: ['commit-value'],
  }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="state"
    :entries="entries"
    :interaction="interaction"
    :code="sourceCode"
  >
    <div class="native-field-demo">
      <label class="text-label" :class="{ 'temporal-field': temporal }">
        <span class="temporal-field__label"><component :is="fieldIcon" :size="16" aria-hidden="true" />{{ title }}</span>
        <component
          :is="component"
          v-bind="ownershipProps"
          :disabled="disabled"
          :readonly="readonly"
          :native="temporal"
          :policies="policies"
          class="text-field temporal-field__input"
          @update:model-value="update"
        />
      </label>
      <p class="temporal-value" role="status" aria-live="polite">
        <span>{{ summaryLabel }}</span>
        <strong>{{ displayValue }}</strong>
      </p>
    </div>
  </DemoCard>
</template>
