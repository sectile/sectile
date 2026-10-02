<script setup lang="ts">
import { ref } from 'vue';
import { SpinButtonDecrement, SpinButtonIncrement, SpinButtonInput, SpinButtonRoot } from '@sectile/vue/spin-button';
const quantity = ref('3');
</script>

<template>
  <div><SpinButtonRoot v-model="quantity" :min="1" :max="10" label="Parcel quantity"><div data-example-control-row><SpinButtonDecrement aria-label="Decrease parcel quantity">Decrease</SpinButtonDecrement><SpinButtonInput /><SpinButtonIncrement aria-label="Increase parcel quantity">Increase</SpinButtonIncrement></div></SpinButtonRoot><output aria-live="polite">Quantity: {{ quantity }}</output><p>Type a quantity or use the step controls. The range is 1–10.</p></div>
</template>
