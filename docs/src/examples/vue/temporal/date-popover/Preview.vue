<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue, type DateValue } from '@sectile/temporal/date-field';
import {
  DatePickerRoot,
  DatePickerContent,
  DatePickerGrid,
  DatePickerCell,
  DatePickerPreviousMonth,
  DatePickerNextMonth,
  DatePickerTrigger,
  DatePickerInput,
} from '@sectile/vue/temporal/date-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateValue | null>(reference);
</script>

<template>
  <div data-example-picker data-example-picker-unit="day">
    <DatePickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose a delivery date"
    >
      <div data-example-control-row>
        <DatePickerInput aria-label="Choose a delivery date" />
        <DatePickerTrigger>
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
        </DatePickerTrigger>
      </div>
      <DatePickerContent>
        <div data-example-calendar-heading>
          <DatePickerPreviousMonth aria-label="Previous month">Previous</DatePickerPreviousMonth>
          <strong>
            {{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}
          </strong>
          <DatePickerNextMonth aria-label="Next month">Next</DatePickerNextMonth>
        </div>
        <DatePickerGrid aria-label="Choose a delivery date">
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
            <DatePickerCell
              v-for="value in row"
              :key="formatDateValue(value)"
              :value="value"
              :aria-label="formatDateValue(value)"
            >
              {{ value.day }}
            </DatePickerCell>
          </div>
        </DatePickerGrid>
      </DatePickerContent>
    </DatePickerRoot>
    <output aria-live="polite">
      Selected: {{ selected ? formatDateValue(selected) : 'none' }}
    </output>
    <p>
      Choose a date or type its YYYY-MM-DD representation. The example uses a fixed reference date
      so server and client start on the same month. The panel stays in document flow here; add the
      public Anchor and Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
