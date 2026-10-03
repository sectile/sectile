<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue } from '@sectile/temporal/date-field';
import { createTimeValue } from '@sectile/temporal/time-field';
import {
  createDateTimeValue,
  formatDateTimeValue,
  type DateTimeValue,
} from '@sectile/temporal/date-time-field';
import {
  DateTimePickerRoot,
  DateTimePickerContent,
  DateTimePickerGrid,
  DateTimePickerCell,
  DateTimePickerPreviousMonth,
  DateTimePickerNextMonth,
  DateTimePickerTrigger,
  DateTimePickerDateTimeInput,
} from '@sectile/vue/temporal/date-time-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateTimeValue | null>(createDateTimeValue(reference, createTimeValue(9, 0)));
</script>

<template>
  <div data-example-picker data-example-picker-unit="day">
    <DateTimePickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose a dispatch date and time"
    >
      <div data-example-control-row>
        <DateTimePickerDateTimeInput aria-label="Choose a dispatch date and time" />
        <DateTimePickerTrigger>
          Choose date
          <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </DateTimePickerTrigger>
      </div>
      <DateTimePickerContent>
        <div data-example-calendar-heading>
          <DateTimePickerPreviousMonth aria-label="Previous month">
            Previous
          </DateTimePickerPreviousMonth>
          <strong>
            {{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}
          </strong>
          <DateTimePickerNextMonth aria-label="Next month">Next</DateTimePickerNextMonth>
        </div>
        <DateTimePickerGrid aria-label="Choose a dispatch date and time">
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
            <DateTimePickerCell
              v-for="value in row"
              :key="formatDateValue(value)"
              :value="value"
              :aria-label="formatDateValue(value)"
            >
              {{ value.day }}
            </DateTimePickerCell>
          </div>
        </DateTimePickerGrid>
      </DateTimePickerContent>
    </DateTimePickerRoot>
    <output aria-live="polite">
      Selected: {{ selected ? formatDateTimeValue(selected) : 'none' }}
    </output>
    <p>
      Values are local date-times without a time zone. Type an endpoint to edit its time; the
      calendar chooses its date. The panel stays in document flow here; add the public Anchor and
      Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
