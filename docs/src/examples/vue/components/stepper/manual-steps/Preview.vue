<script setup lang="ts">
import { ref } from 'vue';
import {
  StepperContent,
  StepperList,
  StepperNext,
  StepperPrevious,
  StepperRoot,
  StepperStep,
} from '@sectile/vue/stepper';
const steps = ['Address', 'Delivery', 'Review'];
const step = ref('Address');
</script>

<template>
  <div>
    <StepperRoot v-model="step" :items="steps">
      <StepperList aria-label="Checkout steps" data-example-control-row>
        <StepperStep v-for="item in steps" :key="item" :value="item">{{ item }}</StepperStep>
      </StepperList>
      <StepperContent value="Address">Confirm your delivery address.</StepperContent>
      <StepperContent value="Delivery">Choose a delivery service.</StepperContent>
      <StepperContent value="Review">Review the request before sending it.</StepperContent>
      <div data-example-control-row>
        <StepperPrevious>Previous step</StepperPrevious>
        <StepperNext>Next step</StepperNext>
      </div>
    </StepperRoot>
    <output aria-live="polite">Step: {{ step }}</output>
    <p>
      Focus does not automatically advance the workflow. This example demonstrates navigation, not
      form validation or checkout submission.
    </p>
  </div>
</template>
