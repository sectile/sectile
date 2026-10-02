<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue, type DateValue } from '@sectile/temporal/date-field';
import { DateField } from '@sectile/vue/temporal/date-field';
const date = ref<DateValue | null>(createDateValue(2026, 10, 3));
const policies = { min: createDateValue(2026, 10, 1), max: createDateValue(2026, 10, 31) };
</script>

<template>
  <div data-example-temporal-field><label>Delivery date<DateField v-model="date" :policies="policies" label="Delivery date" /></label><output aria-live="polite">Date: {{ date ? formatDateValue(date) : 'none' }}</output><p>Enter a date in YYYY-MM-DD format. The allowed range is October 2026.</p></div>
</template>
