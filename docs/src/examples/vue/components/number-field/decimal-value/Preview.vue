<script setup lang="ts">
import { ref } from 'vue';
import { NumberField } from '@sectile/vue/number-field';
const amount = ref<string | null>('12.5');
</script>

<template>
  <div>
    <label>
      Parcel weight (kg)
      <NumberField v-model="amount" label="Parcel weight in kilograms" />
    </label>
    <output aria-live="polite">Committed weight: {{ amount ?? 'empty' }}</output>
    <p>The committed decimal is a string, not a floating-point number.</p>
  </div>
</template>
