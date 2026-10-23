<script setup lang="ts">
import { shallowRef } from 'vue';
import { TemporalProvider, type TemporalFormatterOptions } from '@sectile/vue/temporal/temporal-provider';
import { TimeField } from '@sectile/vue/temporal/time-field';
import { DateTimeField } from '@sectile/vue/temporal/date-time-field';
import { TimeRangeFieldRoot, TimeRangeFieldStartInput, TimeRangeFieldEndInput } from '@sectile/vue/temporal/time-range-field';
import { DateTimeRangeFieldRoot, DateTimeRangeFieldStartInput, DateTimeRangeFieldEndInput } from '@sectile/vue/temporal/date-time-range-field';
const formatting = shallowRef<TemporalFormatterOptions>({ locale: 'ko-KR', timeZone: 'Asia/Seoul' });
</script>

<template>
  <TemporalProvider :formatting="formatting" :reference-instant="0">
    <span>Request-owned Temporal context</span>
    <TimeField precision="minute" />
    <DateTimeField precision="millisecond" />
    <TimeRangeFieldRoot precision="second"><TimeRangeFieldStartInput /><TimeRangeFieldEndInput /></TimeRangeFieldRoot>
    <DateTimeRangeFieldRoot v-slot="state" precision="minute" start-label="Departure" end-label="Arrival">
      <DateTimeRangeFieldStartInput /><DateTimeRangeFieldEndInput />
      <span>{{ state.value?.start.date.year }} {{ state.value?.end.time.hour }}</span>
    </DateTimeRangeFieldRoot>
  </TemporalProvider>
  <!-- @vue-expect-error A formatting selection includes its timezone. -->
  <TemporalProvider :formatting="{ locale: 'ko-KR' }" />
  <!-- @vue-expect-error A request instant is Unix milliseconds. -->
  <TemporalProvider :reference-instant="'2026-10-14'" />
  <!-- @vue-expect-error Time precision is a closed consumer choice. -->
  <TimeField precision="hour" />
  <!-- @vue-expect-error Date-time precision is a closed consumer choice. -->
  <DateTimeField precision="hour" />
  <!-- @vue-expect-error Time range precision is a closed consumer choice. -->
  <TimeRangeFieldRoot precision="hour" />
  <!-- @vue-expect-error Date-time range precision is a closed consumer choice. -->
  <DateTimeRangeFieldRoot precision="hour" />
</template>
