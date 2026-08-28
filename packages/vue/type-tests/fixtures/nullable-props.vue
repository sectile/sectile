<script setup lang="ts">
import { SelectRoot } from '../../.verification-dist/select.js';
import { SpinButtonRoot } from '../../.verification-dist/spin-button.js';
</script>

<template>
  <SelectRoot :items="[]" :model-value="null" :default-value="null" />
  <SpinButtonRoot
    :min="0"
    :max="10"
    :draft="null"
    :default-draft="null"
  />
</template>
