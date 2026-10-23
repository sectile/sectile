<script setup lang="ts">
import { shallowRef } from 'vue';
import { CheckboxTreeRoot, CheckboxTreeItem } from '@sectile/vue/checkbox-tree';
const nodes = [{ id: 'root', parentID: null }, { id: 'leaf', parentID: 'root' }] as const;
const value = shallowRef<readonly ('root' | 'leaf')[]>(['leaf']);
const count = (ids: readonly ('root' | 'leaf')[]): number => ids.length;
</script>
<template>
  <CheckboxTreeRoot :nodes="nodes" v-model="value">
    <template #default="state">
      {{ count(state.value) }}
      <CheckboxTreeItem value="leaf"><template #default="item">{{ item.checked === 'mixed' }}</template></CheckboxTreeItem>
    </template>
  </CheckboxTreeRoot>
  <!-- @vue-expect-error Selected identities cannot widen the nodes' inferred domain. -->
  <CheckboxTreeRoot :nodes="nodes" :model-value="['unknown']" />
  <!-- @vue-expect-error Disabled eligibility is declared on the Root. -->
  <CheckboxTreeItem value="leaf" :disabled="true" />
</template>
