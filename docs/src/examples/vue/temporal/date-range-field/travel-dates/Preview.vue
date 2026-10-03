<script setup lang="ts">
import { ref } from 'vue';
import {
  createDateRange,
  createDateValue,
  formatDateValue,
  type DateRange,
} from '@sectile/temporal/date-field';
import {
  DateRangeFieldEndInput,
  DateRangeFieldRoot,
  DateRangeFieldStartInput,
} from '@sectile/vue/temporal/date-range-field';
const dates = ref<DateRange | null>(
  createDateRange(createDateValue(2026, 10, 3), createDateValue(2026, 10, 7)),
);
</script>

<template>
  <div data-example-temporal-field>
    <DateRangeFieldRoot v-model="dates" start-label="Arrival date" end-label="Departure date">
      <div data-example-control-row>
        <label>
          Arrival
          <DateRangeFieldStartInput />
        </label>
        <label>
          Departure
          <DateRangeFieldEndInput />
        </label>
      </div>
    </DateRangeFieldRoot>
    <output aria-live="polite">
      Stay: {{ dates ? `${formatDateValue(dates.start)} – ${formatDateValue(dates.end)}` : 'none' }}
    </output>
    <p>The two inputs edit one ordered range, not unrelated application values.</p>
  </div>
</template>
