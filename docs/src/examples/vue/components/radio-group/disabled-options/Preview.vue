<script setup lang="ts">
import { ref } from 'vue';
import { RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group';

const options = ['Standard', 'Express', 'Overnight'];
const delivery = ref('Standard');
</script>

<template>
  <div>
    <RadioGroupRoot
      v-model="delivery"
      :items="options"
      :disabled-items="['Overnight']"
      orientation="vertical"
      aria-label="Delivery speed"
    >
      <RadioGroupItem v-for="option in options" :key="option" :value="option">
        <span data-example-radio-box aria-hidden="true"><RadioGroupIndicator /></span>
        {{ option }}
      </RadioGroupItem>
    </RadioGroupRoot>
    <output aria-live="polite">Delivery: {{ delivery }}</output>
  </div>
</template>
