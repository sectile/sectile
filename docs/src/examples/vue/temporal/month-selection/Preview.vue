<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue, type DateValue } from '@sectile/temporal/date-field';
import { MonthPickerRoot, MonthPickerContent, MonthPickerGrid, MonthPickerCell, MonthPickerPreviousYear, MonthPickerNextYear, MonthPickerTrigger, MonthPickerInput } from '@sectile/vue/temporal/month-picker';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateValue | null>(createDateValue(2026, 10, 1));
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
</script>

<template>
  <div data-example-picker data-example-picker-unit="month">
    <MonthPickerRoot v-slot="calendar" v-model="selected" :reference-date="reference" :position="false" label="Choose a billing month">
      <div data-example-control-row>
        <MonthPickerInput aria-label="Choose a billing month" />
        <MonthPickerTrigger>Choose month</MonthPickerTrigger>
      </div>
      <MonthPickerContent>
        <div data-example-calendar-heading>
          <MonthPickerPreviousYear aria-label="Previous year">Previous</MonthPickerPreviousYear>
          <strong>{{ calendar.view.year }}</strong>
          <MonthPickerNextYear aria-label="Next year">Next</MonthPickerNextYear>
        </div>
        <MonthPickerGrid aria-label="Choose a billing month">
          <div v-for="row in calendar.months" :key="`${row[0]!.year}-${row[0]!.month}`" role="row">
            <MonthPickerCell v-for="value in row" :key="`${value.year}-${value.month}`" :value="value" :aria-label="`${value.year}-${String(value.month).padStart(2, '0')}`">{{ monthNames[value.month - 1] }}</MonthPickerCell>
          </div>
        </MonthPickerGrid>
      </MonthPickerContent>
    </MonthPickerRoot>
    <output aria-live="polite">Selected: {{ selected ? formatDateValue(selected) : 'none' }}</output>
    <p>The model uses DateValue boundaries normalized to the first day of the month. Month labels do not imply day-level selection. The panel stays in document flow here; add the public Anchor and Portal parts when the application needs a floating panel.</p>
  </div>
</template>
