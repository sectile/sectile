<script setup lang="ts">
import { computed, ref } from 'vue';
import { Minus, Plus } from '@lucide/vue';
import {
  SpinButtonDecrement,
  SpinButtonIncrement,
  SpinButtonInput,
  SpinButtonRoot,
} from '@sectile/vue/spin-button';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = defineProps<{ readonly scenario: string }>();
const wholeNumber = props.scenario !== 'controlled';
const value = ref(props.scenario === 'invalid-draft' ? '10' : props.scenario === 'controlled' ? '1.5' : '4');
const draft = ref<string | null>(null);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const config = computed(() => wholeNumber
  ? { min: '0', max: '20', step: '1', label: props.scenario === 'invalid-draft' ? 'Retry limit' : 'Team seats' }
  : { min: '-10', max: '10', step: '0.5', label: 'Release offset' });
const helper = computed(() => props.scenario === 'invalid-draft'
  ? 'Enter a whole number. Leaving an invalid edit restores the saved quantity.'
  : wholeNumber ? 'Adjust the number of seats included in this workspace.' : 'Fine-tune the offset in exact half-step increments.');
const suffix = computed(() => props.scenario === 'invalid-draft' ? 'retries' : wholeNumber ? 'seats' : 'points');
const draftInvalid = computed(() => {
  if (draft.value === null) return false;
  const parsed = Number(draft.value);
  return draft.value.trim() === '' || !Number.isFinite(parsed) || parsed < Number(config.value.min) || parsed > Number(config.value.max) || (wholeNumber && !Number.isInteger(parsed));
});
const state = computed(() => ({ value: value.value, draft: draft.value, valid: !draftInvalid.value }));
const code = '';

function update(next: string): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`set-value ${next}`] }, ...entries.value].slice(0, 12);
}

function updateDraft(next: string | null): void {
  draft.value = next;
}
</script>

<template>
  <DemoCard title="Quantity stepper" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <section class="spin-button-demo" :aria-label="config.label">
      <header class="spin-button-heading">
        <span><strong>{{ config.label }}</strong><small>{{ helper }}</small></span>
        <output><strong>{{ value }}</strong> {{ suffix }}</output>
      </header>
      <SpinButtonRoot
        :model-value="value"
        :min="config.min"
        :max="config.max"
        :step="config.step"
        :label="config.label"
        class="spin-button-control"
        @update:model-value="update"
        @update:draft="updateDraft"
      >
        <SpinButtonDecrement class="spin-button-trigger secondary" title="Decrease" aria-label="Decrease">
          <Minus :size="16" aria-hidden="true" />
        </SpinButtonDecrement>
        <SpinButtonInput class="spin-button-input" :aria-describedby="`${scenario}-spin-help`" />
        <SpinButtonIncrement class="spin-button-trigger secondary" title="Increase" aria-label="Increase">
          <Plus :size="16" aria-hidden="true" />
        </SpinButtonIncrement>
      </SpinButtonRoot>
      <p :id="`${scenario}-spin-help`" class="spin-button-help" :class="{ 'spin-button-help--error': draftInvalid }" aria-live="polite">
        {{ draftInvalid ? `Use a whole number from ${config.min} to ${config.max}.` : `Allowed range: ${config.min}–${config.max} · Step ${config.step}` }}
      </p>
    </section>
  </DemoCard>
</template>
