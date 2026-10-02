<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, createDateRange, formatDateValue, type DateRange } from '@sectile/temporal/date-field';
import { DateRangePickerRoot, DateRangePickerContent, DateRangePickerGrid, DateRangePickerCell, DateRangePickerPreviousMonth, DateRangePickerNextMonth, DateRangePickerTrigger, DateRangePickerStartInput, DateRangePickerEndInput } from '@sectile/vue/temporal/date-range-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateRange | null>(createDateRange(reference, createDateValue(2026, 10, 8)));
</script>

<template>
  <div data-example-picker data-example-picker-unit="day">
    <DateRangePickerRoot v-slot="calendar" v-model="selected" :reference-date="reference" :position="false" label="Choose a delivery window">
      <div data-example-picker-inputs>
        <DateRangePickerStartInput aria-label="Range start" />
        <DateRangePickerEndInput aria-label="Range end" />
      </div>
      <DateRangePickerTrigger>Choose dates</DateRangePickerTrigger>
      <DateRangePickerContent>
        <div data-example-calendar-heading>
          <DateRangePickerPreviousMonth aria-label="Previous month">Previous</DateRangePickerPreviousMonth>
          <strong>{{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}</strong>
          <DateRangePickerNextMonth aria-label="Next month">Next</DateRangePickerNextMonth>
        </div>
        <DateRangePickerGrid aria-label="Choose a delivery window">
          <div v-for="row in calendar.dates" :key="formatDateValue(row[0]!)" role="row">
            <DateRangePickerCell v-for="value in row" :key="formatDateValue(value)" :value="value" :aria-label="formatDateValue(value)">{{ value.day }}</DateRangePickerCell>
          </div>
        </DateRangePickerGrid>
      </DateRangePickerContent>
    </DateRangePickerRoot>
    <output aria-live="polite">Selected: {{ selected ? `${formatDateValue(selected.start)} → ${formatDateValue(selected.end)}` : 'none' }}</output>
    <p>Choose the start and end dates. The application owns the committed range; highlight and in-range states are separate from its endpoints. The panel stays in document flow here; add the public Anchor and Portal parts when the application needs a floating panel.</p>
  </div>
</template>
