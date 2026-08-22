<script setup lang="ts">
import { computed, ref } from 'vue';
import catalog from '../../../data/components.json' with { type: 'json' };

const query = ref('');
const title = (value: string): string => value
  .split('-')
  .map((part) => part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`)
  .join(' ');

const components = computed(() => {
  const search = query.value.trim().toLowerCase();
  return catalog.components.filter((component) => {
    if (search.length === 0) return true;
    return [component.id, component.family, ...component.capabilities]
      .some((value) => value.includes(search));
  });
});
</script>

<template>
  <div class="component-catalog">
    <input
      v-model="query"
      class="component-catalog__search"
      type="search"
      placeholder="Filter by component, family, or capability"
      aria-label="Filter components"
    >
    <div class="component-catalog__grid">
      <a
        v-for="component in components"
        :key="component.id"
        class="component-catalog__link"
        :href="`./${component.id}`"
      >
        <strong>{{ title(component.id) }}</strong>
        <span class="component-catalog__family">{{ title(component.family) }}</span>
      </a>
    </div>
  </div>
</template>
