<script setup lang="ts">
import {TransferRoot,TransferList,TransferItem,TransferMove,type TransferMoveProposal} from '@sectile/vue/transfer';
const nodes=[{id:'available',parentID:null},{id:'assigned',parentID:null},{id:'item',parentID:'available'}] as const;
const count=(values:readonly ('available'|'assigned'|'item')[]):number=>values.length;
const moved=(proposal:TransferMoveProposal<'available'|'assigned'|'item'>):number=>proposal.nodes.length;
</script>
<template>
  <TransferRoot :nodes="nodes" source-id="available" target-id="assigned" :typeahead="{ textValue: id => id, maxQueryLength: 16 }" @move="moved">
    <template #default="state">
      {{ count(state.targetItems) }}
      <TransferList side="source" label="Available">
        <TransferItem v-for="id in state.sourceItems" :key="id" :value="id" />
      </TransferList>
      <TransferMove from="source">Assign selected</TransferMove>
      <TransferList side="target" label="Assigned">
        <TransferItem v-for="id in state.targetItems" :key="id" :value="id" />
      </TransferList>
    </template>
  </TransferRoot>
  <!-- @vue-expect-error Pane values cannot widen the source node domain. -->
  <TransferRoot :nodes="nodes" source-id="available" target-id="assigned" :source-value="['missing']" />
</template>
