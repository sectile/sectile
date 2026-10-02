<script setup lang="ts">
import { ref } from 'vue';
import { TreeViewDisclosure, TreeViewGroup, TreeViewItem, TreeViewRoot } from '@sectile/vue/tree-view';
const nodes = [{ id: 'Deliveries', parentID: null }, { id: 'Standard', parentID: 'Deliveries' }, { id: 'Express', parentID: 'Deliveries' }];
const selected = ref<readonly string[]>(['Standard']);
const expanded = ref<readonly string[]>(['Deliveries']);
</script>

<template>
  <div><TreeViewRoot v-model="selected" v-model:expanded-values="expanded" :nodes="nodes" label="Delivery services"><TreeViewItem value="Deliveries"><TreeViewDisclosure for="Deliveries" as="button">Delivery services</TreeViewDisclosure><TreeViewGroup for="Deliveries"><TreeViewItem value="Standard">Standard</TreeViewItem><TreeViewItem value="Express">Express</TreeViewItem></TreeViewGroup></TreeViewItem></TreeViewRoot><output aria-live="polite">Selected: {{ selected.join(', ') || 'none' }}</output><p>Expansion and selection have separate owners. Collapse a branch without clearing its selected child.</p></div>
</template>
