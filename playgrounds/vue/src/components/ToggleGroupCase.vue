<script setup lang="ts">
import { computed, ref } from 'vue';
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group';
import DemoCard from './DemoCard.vue';
import type { EventEntry } from '../types.js';

const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly multiple?: boolean; readonly controlled?: boolean }>(), { multiple: false, controlled: false });
const items = computed(() => props.multiple ? ['bold', 'italic', 'underline'] : ['left', 'center', 'right']);
const initial = computed(() => props.multiple ? ['bold', 'italic'] : ['left']);
const value = ref<readonly string[]>(initial.value);
const ownershipProps = computed(() => props.controlled ? { modelValue: value.value } : { defaultValue: initial.value });
const revision = ref(0);
const entries = ref<EventEntry[]>([]);
const source = computed(() => `<script setup lang="ts">
import { ref } from 'vue'
import { ToggleGroupItem, ToggleGroupRoot } from '@sectile/vue/toggle-group'

const items = ${JSON.stringify(items.value)}
const value = ref(${JSON.stringify(initial.value)})
<\/script>

<template>
  <ToggleGroupRoot :items="items" v-model="value"${props.multiple ? ' multiple' : ''}>
    <ToggleGroupItem v-for="item in items" :key="item" :value="item">
      {{ item }}
    </ToggleGroupItem>
  </ToggleGroupRoot>
</template>`);

function update(next: readonly string[]): void {
  value.value = next; revision.value += 1;
  entries.value = [{ revision: revision.value, event: 'update:modelValue', accepted: true, effects: [`set-pressed value=${next.join(',') || 'none'}`] }, ...entries.value].slice(0, 12);
}
</script>

<template>
  <DemoCard :title="title" :revision="revision" :state="{ value, mode: multiple ? 'multiple' : 'single', ownership: controlled ? 'controlled' : 'uncontrolled' }" :entries="entries" interaction="enabled" :code="source">
    <div class="toggle-group-example">
      <p class="demo-copy">{{ description }}</p>
      <ToggleGroupRoot v-bind="ownershipProps" :items="items" :multiple="multiple" class="toggle-group-control" @update:model-value="update">
        <ToggleGroupItem v-for="item in items" :key="item" :value="item" class="toggle-group-item">{{ item }}</ToggleGroupItem>
      </ToggleGroupRoot>
    </div>
  </DemoCard>
</template>
