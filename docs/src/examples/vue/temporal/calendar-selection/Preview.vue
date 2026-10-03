<script setup lang="ts">
import { ref } from 'vue';
import { createDateValue, formatDateValue, type DateValue } from '@sectile/temporal/date-field';
import { TemporalProvider } from '@sectile/vue/temporal/temporal-provider';
import {
  CalendarCell,
  CalendarContent,
  CalendarGrid,
  CalendarNextMonth,
  CalendarPreviousMonth,
  CalendarRoot,
} from '@sectile/vue/temporal/calendar';

const reference = createDateValue(2026, 10, 3);
const selected = ref<DateValue | null>(reference);
</script>

<template>
  <div data-example-calendar>
    <TemporalProvider :reference-date="reference">
      <CalendarRoot v-slot="calendar" v-model="selected" label="Delivery date">
        <CalendarContent>
          <div data-example-calendar-heading>
            <CalendarPreviousMonth aria-label="Previous month">Previous</CalendarPreviousMonth>
            <strong>
              {{ calendar.view.year }}-{{ String(calendar.view.month).padStart(2, '0') }}
            </strong>
            <CalendarNextMonth aria-label="Next month">Next</CalendarNextMonth>
          </div>
          <CalendarGrid aria-label="Available delivery dates">
            <div role="row" data-example-weekdays>
              <span
                v-for="day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']"
                :key="day"
                role="columnheader"
              >
                {{ day }}
              </span>
            </div>
            <div v-for="week in calendar.dates" :key="formatDateValue(week[0]!)" role="row">
              <CalendarCell
                v-for="date in week"
                :key="formatDateValue(date)"
                :value="date"
                :aria-label="formatDateValue(date)"
              >
                {{ date.day }}
              </CalendarCell>
            </div>
          </CalendarGrid>
        </CalendarContent>
      </CalendarRoot>
    </TemporalProvider>
    <output aria-live="polite">
      Selected date: {{ selected ? formatDateValue(selected) : 'none' }}
    </output>
  </div>
</template>
