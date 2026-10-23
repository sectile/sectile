<script setup lang="ts">
import { TreeReorderRoot, TreeReorderItem, TreeReorderDropTarget, SequenceReorderRoot } from '@sectile/vue/reorder';
const nodes = [{ id: 'left', parentID: null }, { id: 'right', parentID: null }, { id: 'a', parentID: 'left' }] as const;
const accept = (value: readonly ('left' | 'right' | 'a')[]): number => value.length;
const acceptSequence = (value: readonly ('a' | 'b')[]): number => value.length;
</script>
<template>
  <TreeReorderRoot :nodes="nodes" layout="columns" @update:nodes="value => accept(value.map(node => node.id))">
    <template #default="state">
      {{ accept(state.getChildren(null)) }}
      {{ state.canMove('a', { parentID: 'right' }) }}
      <TreeReorderItem v-for="id in state.getChildren(null)" :key="id" :value="id">
        <TreeReorderDropTarget :parent-i-d="id" :label="id">
          <TreeReorderItem v-for="child in state.getChildren(id)" :key="child" :value="child" />
        </TreeReorderDropTarget>
      </TreeReorderItem>
      <!-- @vue-expect-error Queries cannot widen source identities. -->
      {{ state.getChildren('missing') }}
    </template>
  </TreeReorderRoot>
  <SequenceReorderRoot :items="(['a', 'b'] as const)" @update:items="acceptSequence" />
</template>
