<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue } from '@sectile/temporal/date-field';
import { createTimeValue } from '@sectile/temporal/time-field';
import { createDateTimeValue, formatDateTimeValue, type DateTimeValue } from '@sectile/temporal/date-time-field';
import { DateTimeField } from '@sectile/vue/temporal/date-time-field';
const appointment = ref<DateTimeValue | null>(createDateTimeValue(createDateValue(2026, 10, 3), createTimeValue(9, 30)));
</script>

<template>
  <div data-example-temporal-field><label>Collection appointment<DateTimeField v-model="appointment" native label="Collection appointment" /></label><output aria-live="polite">Appointment: {{ appointment ? formatDateTimeValue(appointment) : 'none' }}</output><p>A local date and time do not identify a time-zone-aware instant. Resolve the intended zone in your application.</p></div>
</template>
