<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue, type DateValue } from '@sectile/temporal/date-field';
import {
  YearPickerRoot,
  YearPickerContent,
  YearPickerGrid,
  YearPickerCell,
  YearPickerPreviousPage,
  YearPickerNextPage,
  YearPickerTrigger,
  YearPickerInput,
} from '@sectile/vue/temporal/year-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateValue | null>(createDateValue(2026, 1, 1));
</script>

<template>
  <div data-example-picker data-example-picker-unit="year">
    <YearPickerRoot
      v-slot="calendar"
      v-model="selected"
      :reference-date="reference"
      :position="false"
      label="Choose a reporting year"
    >
      <div data-example-control-row>
        <YearPickerInput aria-label="Choose a reporting year" />
        <YearPickerTrigger>
          Choose year
          <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </YearPickerTrigger>
      </div>
      <YearPickerContent>
        <div data-example-calendar-heading>
          <YearPickerPreviousPage aria-label="Previous page">Previous</YearPickerPreviousPage>
          <strong>{{ calendar.view.year }}</strong>
          <YearPickerNextPage aria-label="Next page">Next</YearPickerNextPage>
        </div>
        <YearPickerGrid aria-label="Choose a reporting year">
          <div v-for="row in calendar.years" :key="row[0]!.year" role="row">
            <YearPickerCell
              v-for="value in row"
              :key="value.year"
              :value="value"
              :aria-label="String(value.year)"
            >
              {{ value.year }}
            </YearPickerCell>
          </div>
        </YearPickerGrid>
      </YearPickerContent>
    </YearPickerRoot>
    <output aria-live="polite">
      Selected: {{ selected ? formatDateValue(selected) : 'none' }}
    </output>
    <p>
      The model uses DateValue boundaries normalized to the first day of the year. Previous and next
      move the visible year page. The panel stays in document flow here; add the public Anchor and
      Portal parts when the application needs a floating panel.
    </p>
  </div>
</template>
