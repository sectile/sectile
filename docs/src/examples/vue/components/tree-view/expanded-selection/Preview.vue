<script setup lang="ts">
import { ref } from 'vue';
import {
  TreeViewDisclosure,
  TreeViewGroup,
  TreeViewItem,
  TreeViewRoot,
} from '@sectile/vue/tree-view';
const branches = [
  { id: 'Deliveries', label: 'Home delivery', children: ['Standard', 'Express'] },
  { id: 'Collection', label: 'Collection points', children: ['Parcel locker', 'Service desk'] },
];
const nodes = branches.flatMap((branch) => [
  { id: branch.id, parentID: null },
  ...branch.children.map((id) => ({ id, parentID: branch.id })),
]);
const selected = ref<readonly string[]>(['Standard']);
const expanded = ref<readonly string[]>(['Deliveries']);
</script>

<template>
  <div data-example-tree-view>
    <TreeViewRoot
      v-model="selected"
      v-model:expanded-values="expanded"
      :nodes="nodes"
      label="Delivery services"
    >
      <TreeViewItem v-for="branch in branches" :key="branch.id" :value="branch.id">
        <TreeViewDisclosure :for="branch.id" as="button">
          <svg data-example-disclosure-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m5 3 5 5-5 5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ branch.label }}
        </TreeViewDisclosure>
        <TreeViewGroup :for="branch.id">
          <TreeViewItem v-for="service in branch.children" :key="service" :value="service">
            <span data-example-tree-leaf>{{ service }}</span>
          </TreeViewItem>
        </TreeViewGroup>
      </TreeViewItem>
    </TreeViewRoot>
    <output aria-live="polite">Selected: {{ selected.join(', ') || 'none' }}</output>
    <p>
      Expand a delivery branch and select a service. Collapsing its branch preserves the selected
      service.
    </p>
  </div>
</template>
