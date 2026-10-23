<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import {
  TimePickerRoot, TimePickerInput, TimePickerTrigger, TimePickerContent,
  TimePickerColumn, TimePickerItem, type TimeValue,
} from '@sectile/vue/temporal/time-picker'

const value = shallowRef<TimeValue | null>({ hour: 12, minute: 30, second: 0, millisecond: 0 })
const renderedChoices = shallowRef<readonly number[] | undefined>(undefined)
const picker = useTemplateRef<InstanceType<typeof TimePickerRoot>>('picker')
const chooseHour = () => picker.value?.selectChoice('hour', 13)
void chooseHour
</script>

<template>
  <TimePickerRoot ref="picker" v-model="value" label="Delivery time" name="deliveryTime">
    <TimePickerInput label="Delivery time" />
    <TimePickerTrigger>Choose time</TimePickerTrigger>
    <TimePickerContent v-slot="{ columns }">
      <TimePickerColumn
        v-for="column in columns" :key="column.part"
        :part="column.part" :label="column.part" :rendered-choices="renderedChoices" v-slot="{ choices }"
      >
        <TimePickerItem v-for="choice in choices" :key="choice.id" :value="choice.id" v-slot="state">
          {{ state.choice.label }}{{ state.selected ? ' selected' : '' }}
        </TimePickerItem>
      </TimePickerColumn>
    </TimePickerContent>
  </TimePickerRoot>
</template>
