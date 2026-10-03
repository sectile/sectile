<script setup lang="ts">
import { ref } from 'vue';
import {
  createDateValue,
  createDateRange,
  formatDateValue,
  type DateRange,
} from '@sectile/temporal/date-field';
import {
  MonthRangePickerRoot,
  MonthRangePickerContent,
  MonthRangePickerGrid,
  MonthRangePickerCell,
  MonthRangePickerPreviousYear,
  MonthRangePickerNextYear,
  MonthRangePickerTrigger,
  MonthRangePickerStartInput,
  MonthRangePickerEndInput,
} from '@sectile/vue/temporal/month-range-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateRange | null>(
  createDateRange(createDateValue(2026, 10, 1), createDateValue(2026, 12, 1)),
);
const monthNames = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
</script>

<template>
  <div data-example-picker data-example-picker-unit="month">
    <MonthRangePickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose a billing period"
    >
      <div data-example-picker-inputs>
        <MonthRangePickerStartInput aria-label="Range start" />
        <MonthRangePickerEndInput aria-label="Range end" />
      </div>
      <MonthRangePickerTrigger>
        Choose months
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </MonthRangePickerTrigger>
      <MonthRangePickerContent>
        <div data-example-calendar-heading>
          <MonthRangePickerPreviousYear aria-label="Previous year">
            Previous
          </MonthRangePickerPreviousYear>
          <strong>{{ calendar.view.year }}</strong>
          <MonthRangePickerNextYear aria-label="Next year">Next</MonthRangePickerNextYear>
        </div>
        <MonthRangePickerGrid aria-label="Choose a billing period">
          <div v-for="row in calendar.months" :key="`${row[0]!.year}-${row[0]!.month}`" role="row">
            <MonthRangePickerCell
              v-for="value in row"
              :key="`${value.year}-${value.month}`"
              :value="value"
              :aria-label="`${value.year}-${String(value.month).padStart(2, '0')}`"
            >
              {{ monthNames[value.month - 1] }}
            </MonthRangePickerCell>
          </div>
        </MonthRangePickerGrid>
      </MonthRangePickerContent>
    </MonthRangePickerRoot>
    <output aria-live="polite">
      Selected:
      {{
        selected ? `${formatDateValue(selected.start)} → ${formatDateValue(selected.end)}` : 'none'
      }}
    </output>
    <p>
      The model uses DateValue boundaries normalized to the first day of the month. Month labels do
      not imply day-level selection. The panel stays in document flow here; add the public Anchor
      and Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
