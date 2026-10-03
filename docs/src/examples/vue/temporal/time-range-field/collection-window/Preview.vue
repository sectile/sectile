<script setup lang="ts">
import { ref } from 'vue';
import { createTimeValue, formatTimeValue } from '@sectile/temporal/time-field';
import { createTimeRange, type TimeRange } from '@sectile/temporal/time-range-field';
import {
  TimeRangeFieldEndInput,
  TimeRangeFieldRoot,
  TimeRangeFieldStartInput,
} from '@sectile/vue/temporal/time-range-field';
const window = ref<TimeRange | null>(createTimeRange(createTimeValue(9), createTimeValue(12)));
</script>

<template>
  <div data-example-temporal-field>
    <TimeRangeFieldRoot
      v-model="window"
      start-label="Collection starts"
      end-label="Collection ends"
    >
      <div data-example-control-row>
        <label>
          Starts
          <TimeRangeFieldStartInput />
        </label>
        <label>
          Ends
          <TimeRangeFieldEndInput />
        </label>
      </div>
    </TimeRangeFieldRoot>
    <output aria-live="polite">
      Window:
      {{ window ? `${formatTimeValue(window.start)} – ${formatTimeValue(window.end)}` : 'none' }}
    </output>
    <p>Enter each endpoint as HH:mm. This example is a same-day collection window.</p>
  </div>
</template>
