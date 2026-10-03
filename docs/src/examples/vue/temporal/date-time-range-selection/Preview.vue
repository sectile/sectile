<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue } from '@sectile/temporal/date-field';
import { createTimeValue } from '@sectile/temporal/time-field';
import {
  createDateTimeValue,
  createDateTimeRange,
  formatDateTimeValue,
  type DateTimeRange,
} from '@sectile/temporal/date-time-field';
import {
  DateTimeRangePickerRoot,
  DateTimeRangePickerContent,
  DateTimeRangePickerGrid,
  DateTimeRangePickerCell,
  DateTimeRangePickerPreviousMonth,
  DateTimeRangePickerNextMonth,
  DateTimeRangePickerTrigger,
  DateTimeRangePickerStartDateTimeInput,
  DateTimeRangePickerEndDateTimeInput,
} from '@sectile/vue/temporal/date-time-range-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateTimeRange | null>(
  createDateTimeRange(
    createDateTimeValue(reference, createTimeValue(9, 0)),
    createDateTimeValue(createDateValue(2026, 10, 8), createTimeValue(17, 0)),
  ),
);
</script>

<template>
  <div data-example-picker data-example-picker-unit="day">
    <DateTimeRangePickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose a dispatch interval"
    >
      <div data-example-picker-inputs>
        <DateTimeRangePickerStartDateTimeInput aria-label="Range start" />
        <DateTimeRangePickerEndDateTimeInput aria-label="Range end" />
      </div>
      <DateTimeRangePickerTrigger>
        Choose dates
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </DateTimeRangePickerTrigger>
      <DateTimeRangePickerContent>
        <div data-example-calendar-heading>
          <DateTimeRangePickerPreviousMonth aria-label="Previous month">
            Previous
          </DateTimeRangePickerPreviousMonth>
          <strong>
            {{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}
          </strong>
          <DateTimeRangePickerNextMonth aria-label="Next month">Next</DateTimeRangePickerNextMonth>
        </div>
        <DateTimeRangePickerGrid aria-label="Choose a dispatch interval">
          <div role="row" data-example-weekdays>
            <span
              v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
              :key="day"
              role="columnheader"
            >
              {{ day }}
            </span>
          </div>
          <div v-for="row in calendar.dates" :key="formatDateValue(row[0]!)" role="row">
            <DateTimeRangePickerCell
              v-for="value in row"
              :key="formatDateValue(value)"
              :value="value"
              :aria-label="formatDateValue(value)"
            >
              {{ value.day }}
            </DateTimeRangePickerCell>
          </div>
        </DateTimeRangePickerGrid>
      </DateTimeRangePickerContent>
    </DateTimeRangePickerRoot>
    <output aria-live="polite">
      Selected:
      {{
        selected
          ? `${formatDateTimeValue(selected.start)} → ${formatDateTimeValue(selected.end)}`
          : 'none'
      }}
    </output>
    <p>
      Values are local date-times without a time zone. Type an endpoint to edit its time; the
      calendar chooses its date. The panel stays in document flow here; add the public Anchor and
      Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
