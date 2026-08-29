<script setup lang="ts">
import { computed, ref } from 'vue';
import { PopoverArrow, PopoverClose, PopoverContent, PopoverDescription, PopoverRoot, PopoverTitle, PopoverTrigger } from '@sectile/vue/popover';
import { TextField } from '@sectile/vue/text';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly side?: 'top' | 'right' | 'bottom' | 'left'; readonly controlled?: boolean; readonly preview?: boolean }>(), { side: 'bottom', controlled: false, preview: false });
const open = ref(props.preview);
const resolvedSide = computed(() => props.side);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const source = computed(() => `<script setup lang="ts">
import { ref } from 'vue'
import { PopoverArrow, PopoverClose, PopoverContent, PopoverDescription, PopoverRoot, PopoverTitle, PopoverTrigger } from '@sectile/vue/popover'
import { TextField } from '@sectile/vue/text'

const open = ref(false)
<\/script>

<template>
  <PopoverRoot v-model:open="open" side="${props.side}" align="center" :close-on-interact-outside="false">
    <PopoverTrigger>Edit profile</PopoverTrigger>
    <PopoverContent>
      <PopoverArrow />
      <PopoverTitle>Profile details</PopoverTitle>
      <PopoverDescription>Change the public display name.</PopoverDescription>
      <label>Display name <TextField default-value="Sectile" /></label>
      <PopoverClose>Save changes</PopoverClose>
    </PopoverContent>
  </PopoverRoot>
</template>`);
function update(next: boolean): void {
  open.value = next; revision.value += 1;
  entries.value = [{ revision: revision.value, event: next ? 'open' : 'close', accepted: true, effects: [`set-open value=${next}`] }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="{ open, side: resolvedSide, ownership: controlled ? 'controlled' : 'uncontrolled' }" :entries="entries" interaction="enabled" :code="source">
    <div class="popover-example" :class="{ 'popover-example--right': side === 'right' }">
      <p class="demo-copy">{{ description }}</p>
      <PopoverRoot
        v-bind="controlled ? { open } : { defaultOpen: preview }"
        :side="side"
        align="center"
        :auto-focus="!preview"
        :restore-focus="!preview"
        :close-on-interact-outside="false"
        @update:open="update"
      >
        <PopoverTrigger class="secondary popover-trigger">Edit profile</PopoverTrigger>
        <PopoverContent class="popover-content">
          <PopoverArrow class="popover-arrow" />
          <PopoverTitle class="popover-title">Profile details</PopoverTitle>
          <PopoverDescription class="popover-description">Change the public display name.</PopoverDescription>
          <label class="popover-field"><span>Display name</span><TextField class="catalog-input" aria-label="Display name" default-value="Sectile" /></label>
          <div class="popover-actions"><PopoverClose>Save changes</PopoverClose></div>
        </PopoverContent>
      </PopoverRoot>
    </div>
  </DemoCard>
</template>
