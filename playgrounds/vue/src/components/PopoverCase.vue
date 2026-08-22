<script setup lang="ts">
import { computed, ref } from 'vue';
import { PopoverArrow, PopoverClose, PopoverContent, PopoverDescription, PopoverRoot, PopoverTitle, PopoverTrigger } from '@sectile/vue/popover';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly side?: 'top' | 'right' | 'bottom' | 'left'; readonly controlled?: boolean }>(), { side: 'bottom', controlled: false });
const open = ref(false);
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const source = computed(() => `<script setup lang="ts">
import { ref } from 'vue'
import { PopoverArrow, PopoverClose, PopoverContent, PopoverRoot, PopoverTrigger } from '@sectile/vue/popover'

const open = ref(false)
<\/script>

<template>
  <PopoverRoot v-model:open="open" side="${props.side}" align="center">
    <PopoverTrigger>Edit profile</PopoverTrigger>
    <PopoverContent>
      <PopoverArrow />
      <input aria-label="Display name" value="Sectile" />
      <PopoverClose>Done</PopoverClose>
    </PopoverContent>
  </PopoverRoot>
</template>`);
function update(next: boolean): void {
  open.value = next; revision.value += 1;
  entries.value = [{ revision: revision.value, event: next ? 'open' : 'close', accepted: true, effects: [`set-open value=${next}`] }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="{ open, side, ownership: controlled ? 'controlled' : 'uncontrolled' }" :entries="entries" interaction="enabled" :code="source">
    <div class="popover-example">
      <p class="demo-copy">{{ description }}</p>
      <PopoverRoot :open="controlled ? open : undefined" :default-open="controlled ? undefined : false" :side="side" align="center" @update:open="update">
        <PopoverTrigger class="secondary">Edit profile</PopoverTrigger>
        <PopoverContent class="popover-content">
          <PopoverArrow class="popover-arrow" />
          <PopoverTitle>Profile details</PopoverTitle>
          <PopoverDescription class="demo-copy">Change the public display name.</PopoverDescription>
          <input aria-label="Display name" value="Sectile" />
          <PopoverClose class="secondary">Done</PopoverClose>
        </PopoverContent>
      </PopoverRoot>
    </div>
  </DemoCard>
</template>
