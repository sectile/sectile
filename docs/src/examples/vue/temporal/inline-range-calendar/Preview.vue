<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, createDateRange, formatDateValue, type DateRange } from '@sectile/temporal/date-field';
import { RangeCalendarRoot, RangeCalendarContent, RangeCalendarGrid, RangeCalendarCell, RangeCalendarPreviousMonth, RangeCalendarNextMonth } from '@sectile/vue/temporal/range-calendar';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateRange | null>(createDateRange(reference, createDateValue(2026, 10, 8)));
</script>

<template>
  <div data-example-picker data-example-picker-unit="day">
    <RangeCalendarRoot v-slot="calendar" v-model="selected" :reference-date="reference" label="Inline date range">
      <RangeCalendarContent>
        <div data-example-calendar-heading>
          <RangeCalendarPreviousMonth aria-label="Previous month">Previous</RangeCalendarPreviousMonth>
          <strong>{{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}</strong>
          <RangeCalendarNextMonth aria-label="Next month">Next</RangeCalendarNextMonth>
        </div>
        <RangeCalendarGrid aria-label="Inline date range">
          <div v-for="row in calendar.dates" :key="formatDateValue(row[0]!)" role="row">
            <RangeCalendarCell v-for="value in row" :key="formatDateValue(value)" :value="value" :aria-label="formatDateValue(value)">{{ value.day }}</RangeCalendarCell>
          </div>
        </RangeCalendarGrid>
      </RangeCalendarContent>
    </RangeCalendarRoot>
    <output aria-live="polite">Selected: {{ selected ? `${formatDateValue(selected.start)} → ${formatDateValue(selected.end)}` : 'none' }}</output>
    <p>Choose the start and end dates. The application owns the committed range; highlight and in-range states are separate from its endpoints.</p>
  </div>
</template>
