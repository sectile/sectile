<script setup lang="ts">
import { ref } from 'vue';
import { createTimeValue, formatTimeValue, type TimeValue } from '@sectile/temporal/time-field';
import { TimeField } from '@sectile/vue/temporal/time-field';
const time = ref<TimeValue | null>(createTimeValue(9, 30));
</script>

<template>
  <div data-example-temporal-field>
    <label>
      Collection time
      <TimeField v-model="time" native label="Collection time" />
    </label>
    <output aria-live="polite">Time: {{ time ? formatTimeValue(time) : 'none' }}</output>
    <p>
      The browser supplies the native time input. This value is a time of day, without a date or
      time zone.
    </p>
  </div>
</template>
