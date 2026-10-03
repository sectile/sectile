<script setup lang="ts">
import { ref } from 'vue';
import { PinInputInput, PinInputRoot } from '@sectile/vue/pin-input';
const code = ref('');
</script>

<template>
  <div>
    <PinInputRoot
      v-slot="pin"
      v-model="code"
      :length="4"
      otp
      label="Four-character verification code"
    >
      <div data-example-control-row>
        <PinInputInput v-for="index in 4" :key="index" :index="index - 1" />
      </div>
      <output aria-live="polite">{{ pin.complete ? 'Complete code' : 'Code incomplete' }}</output>
    </PinInputRoot>
    <p>This is an input demonstration; the code is not sent or verified.</p>
  </div>
</template>
