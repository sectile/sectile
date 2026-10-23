<script setup lang="ts">
import { shallowRef } from 'vue';
import { ContextMenuRoot, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@sectile/vue/context-menu';
const open = shallowRef(false);
const items = [{ id: 'copy', parentID: null }, { id: 'remove', parentID: null }] as const;
const invoke = (value: string): void => { void value; };
</script>

<template>
  <ContextMenuRoot v-model:open="open" :items="items" @invoke="invoke">
    <ContextMenuTrigger>Parcel actions</ContextMenuTrigger>
    <ContextMenuContent>
      <ContextMenuItem value="copy">Copy</ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem value="remove">Remove</ContextMenuItem>
    </ContextMenuContent>
  </ContextMenuRoot>
</template>
