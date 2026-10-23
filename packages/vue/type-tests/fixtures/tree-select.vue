<script setup lang="ts">
import { shallowRef } from 'vue';
import { TreeSelectRoot, TreeSelectInput, TreeSelectContent, TreeSelectItem, type TreeSelectSearchRequest } from '@sectile/vue/tree-select';
const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }] as const;
const value = shallowRef<readonly ('root' | 'leaf')[]>(['leaf']);
const results = shallowRef<{ request: TreeSelectSearchRequest; results: readonly ('root' | 'leaf')[] }>();
const count = (ids: readonly ('root' | 'leaf')[]): number => ids.length;
</script>
<template>
  <TreeSelectRoot :nodes="nodes" v-model="value" :results="results" @search="request => { results = { request, results: ['leaf'] } }">
    <template #default="state">
      {{ count(state.value) }}
      <TreeSelectInput /><TreeSelectContent><TreeSelectItem value="leaf" /></TreeSelectContent>
    </template>
  </TreeSelectRoot>
  <!-- @vue-expect-error Selected IDs cannot widen the source node domain. -->
  <TreeSelectRoot :nodes="nodes" :model-value="['missing']" />
  <!-- @vue-expect-error Root owns disabled eligibility, including unmounted IDs. -->
  <TreeSelectItem value="leaf" :disabled="true" />
</template>
