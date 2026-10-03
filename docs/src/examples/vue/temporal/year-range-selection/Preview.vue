<script setup lang="ts">
import { ref } from 'vue';
import {
  createDateValue,
  createDateRange,
  formatDateValue,
  type DateRange,
} from '@sectile/temporal/date-field';
import {
  YearRangePickerRoot,
  YearRangePickerContent,
  YearRangePickerGrid,
  YearRangePickerCell,
  YearRangePickerPreviousPage,
  YearRangePickerNextPage,
  YearRangePickerTrigger,
  YearRangePickerStartInput,
  YearRangePickerEndInput,
} from '@sectile/vue/temporal/year-range-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateRange | null>(
  createDateRange(createDateValue(2026, 1, 1), createDateValue(2028, 1, 1)),
);
</script>

<template>
  <div data-example-picker data-example-picker-unit="year">
    <YearRangePickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose reporting years"
    >
      <div data-example-picker-inputs>
        <YearRangePickerStartInput aria-label="Range start" />
        <YearRangePickerEndInput aria-label="Range end" />
      </div>
      <YearRangePickerTrigger>
        Choose years
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </YearRangePickerTrigger>
      <YearRangePickerContent>
        <div data-example-calendar-heading>
          <YearRangePickerPreviousPage aria-label="Previous page">
            Previous
          </YearRangePickerPreviousPage>
          <strong>{{ calendar.view.year }}</strong>
          <YearRangePickerNextPage aria-label="Next page">Next</YearRangePickerNextPage>
        </div>
        <YearRangePickerGrid aria-label="Choose reporting years">
          <div v-for="row in calendar.years" :key="row[0]!.year" role="row">
            <YearRangePickerCell
              v-for="value in row"
              :key="value.year"
              :value="value"
              :aria-label="String(value.year)"
            >
              {{ value.year }}
            </YearRangePickerCell>
          </div>
        </YearRangePickerGrid>
      </YearRangePickerContent>
    </YearRangePickerRoot>
    <output aria-live="polite">
      Selected:
      {{
        selected ? `${formatDateValue(selected.start)} → ${formatDateValue(selected.end)}` : 'none'
      }}
    </output>
    <p>
      The model uses DateValue boundaries normalized to the first day of the year. Previous and next
      move the visible year page. The panel stays in document flow here; add the public Anchor and
      Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
