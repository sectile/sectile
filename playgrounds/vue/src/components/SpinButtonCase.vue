<script setup lang="ts">
import { ref } from 'vue';
import { Minus, Plus } from '@lucide/vue';
import {
  SpinButtonDecrement,
  SpinButtonIncrement,
  SpinButtonInput,
  SpinButtonRoot,
} from '@sectile/vue/spin-button';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const value = ref('1.5');
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
function update(next: string): void {
  value.value = next;
  revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`set-value ${next}`] }, ...entries.value].slice(0, 12);
}
const code = `<script setup lang="ts">
import { ref } from 'vue';
import { Minus, Plus } from '@lucide/vue';
import {
  SpinButtonDecrement,
  SpinButtonIncrement,
  SpinButtonInput,
  SpinButtonRoot,
} from '@sectile/vue/spin-button';

const value = ref('1.5');
<\/script>

<template>
  <SpinButtonRoot v-model="value" min="-10" max="10" step="0.5">
    <SpinButtonDecrement><Minus /></SpinButtonDecrement>
    <SpinButtonInput />
    <SpinButtonIncrement><Plus /></SpinButtonIncrement>
  </SpinButtonRoot>
</template>`;
</script>

<template>
  <DemoCard title="Exact decimal stepper" :revision="revision" :state="{ value }" :entries="entries" interaction="enabled" :code="code">
    <div class="spin-button-demo">
      <p class="demo-copy">The input stays native; optional triggers dispatch the same exact-decimal semantics.</p>
      <SpinButtonRoot :model-value="value" min="-10" max="10" step="0.5" label="Adjustment" class="spin-button-control" @update:model-value="update">
        <SpinButtonDecrement class="spin-button-trigger secondary" title="Decrease" aria-label="Decrease">
          <Minus :size="16" aria-hidden="true" />
        </SpinButtonDecrement>
        <SpinButtonInput class="spin-button-input" />
        <SpinButtonIncrement class="spin-button-trigger secondary" title="Increase" aria-label="Increase">
          <Plus :size="16" aria-hidden="true" />
        </SpinButtonIncrement>
      </SpinButtonRoot>
    </div>
  </DemoCard>
</template>
