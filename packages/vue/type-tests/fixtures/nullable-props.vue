<script setup lang="ts">
import { SelectRoot } from '@sectile/vue/select';
import { TagsInputRoot } from '@sectile/vue/tags-input';
import { SpinButtonRoot } from '@sectile/vue/spin-button';
</script>

<template>
  <TagsInputRoot :default-value="['Vue']" :remove-label="(value, index) => `${index + 1}: ${value} 삭제`" />
  <SelectRoot :items="[]" :model-value="null" :default-value="null" />
  <SpinButtonRoot
    :min="0"
    :max="10"
    :draft="null"
    :default-draft="null"
  />
</template>
