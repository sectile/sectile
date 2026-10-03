<script setup lang="ts">
import { ref, useId } from 'vue';
import {
  createStandardQuantityPolicies,
  QuantityFieldInput,
  QuantityFieldRoot,
  QuantityFieldUnitSelect,
} from '@sectile/vue/quantity-field';

const policies = createStandardQuantityPolicies('metre', 'metric');
const quantity = ref<{ value: string; unit: string } | null>({ value: '1.5', unit: 'metre' });
const displayUnit = ref('centimetre');
const inputID = useId();
</script>

<template>
  <div>
    <QuantityFieldRoot
      v-slot="field"
      v-model="quantity"
      v-model:display-unit="displayUnit"
      :policies="policies"
      label="Parcel length"
    >
      <label :for="inputID" data-example-field-label>Parcel length</label>
      <div data-example-field-group>
        <QuantityFieldInput :id="inputID" aria-label="Parcel length" placeholder="Enter a length" />
        <QuantityFieldUnitSelect aria-label="Display unit" />
      </div>
      <p v-if="field.invalid" role="alert">Enter a compatible length expression.</p>
    </QuantityFieldRoot>
    <output aria-live="polite">
      Canonical value: {{ quantity ? `${quantity.value} ${quantity.unit}` : 'none' }}
    </output>
    <p>
      Choose a display unit or enter an expression such as “150 cm”. The stored quantity remains in
      metres; display units do not change its dimension.
    </p>
  </div>
</template>
