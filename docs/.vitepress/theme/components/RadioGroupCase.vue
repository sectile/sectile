<script setup lang="ts">
import { computed, ref } from 'vue';
import { Circle } from '@lucide/vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{ readonly controlled?: boolean; readonly readonly?: boolean }>(), { controlled: false, readonly: false });
const options = [
  { value: 'email', label: 'Email', copy: 'Detailed release summaries' },
  { value: 'push', label: 'Push', copy: 'Immediate deployment alerts' },
  { value: 'sms', label: 'SMS', copy: 'Unavailable on this plan', disabled: true },
] as const;
const items = options.map((option) => option.value);
const value = ref('email');
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const ownership = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: 'email' });
const state = computed(() => ({ value: value.value, ownership: props.controlled ? 'controlled' : 'uncontrolled' }));
const code = `<script setup lang="ts">
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group';

const items = ['email', 'push', 'sms'];
<\/script>

<template>
  <RadioGroupRoot :items="items" default-value="email" name="channel">
    <RadioGroupItem v-for="item in items" :key="item" :value="item">
      {{ item }}
      <RadioGroupIndicator />
    </RadioGroupItem>
  </RadioGroupRoot>
</template>`;
function update(next: string): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`check-radio value=${next}`] }, ...entries.value];
}
</script>

<template>
  <DemoCard title="Notification channel" :revision="revision" :state="state" :entries="entries" :code="code" :interaction="readonly ? 'readonly' : 'enabled'">
    <div class="radio-demo">
      <p class="demo-copy">Arrow keys move and check like a native radio group. Form values use hidden native radios.</p>
      <RadioGroupRoot v-bind="ownership" :items="items" :disabled-items="['sms']" :readonly="readonly" name="channel" class="radio-control" @update:model-value="update">
        <RadioGroupItem v-for="option in options" :key="option.value" :value="option.value" :disabled="'disabled' in option && option.disabled" class="radio-option">
          <RadioGroupIndicator class="radio-marker"><Circle :size="9" fill="currentColor" aria-hidden="true" /></RadioGroupIndicator>
          <span><strong>{{ option.label }}</strong><small>{{ option.copy }}</small></span>
        </RadioGroupItem>
      </RadioGroupRoot>
    </div>
  </DemoCard>
</template>
