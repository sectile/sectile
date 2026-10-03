<script setup lang="ts">
import { ref } from 'vue';
import {
  TagsInputClear,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDelete,
  TagsInputItemText,
  TagsInputRoot,
} from '@sectile/vue/tags-input';
const tags = ref<readonly string[]>(['priority']);
</script>

<template>
  <div>
    <TagsInputRoot v-model="tags" label="Delivery tags">
      <div data-example-control-row>
        <TagsInputItem v-for="(tag, index) in tags" :key="tag" :index="index">
          <TagsInputItemText />
          <TagsInputItemDelete :aria-label="`Remove ${tag}`">Remove</TagsInputItemDelete>
        </TagsInputItem>
        <TagsInputInput placeholder="Add a tag" />
        <TagsInputClear>Clear all</TagsInputClear>
      </div>
    </TagsInputRoot>
    <output aria-live="polite">Tags: {{ tags.join(', ') || 'none' }}</output>
    <p>Type a tag and press Enter. Each existing tag has an explicit removal control.</p>
  </div>
</template>
