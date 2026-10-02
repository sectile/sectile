<script setup lang="ts">
import { ref } from 'vue';
import { MenubarContent, MenubarItem, MenubarRoot } from '@sectile/vue/menubar';
const items = [{ id: 'File', parentID: null }, { id: 'Archive', parentID: 'File' }, { id: 'Export', parentID: 'File' }, { id: 'Help', parentID: null }, { id: 'Shortcuts', parentID: 'Help' }];
const invoked = ref('none');
</script>

<template>
  <div><MenubarRoot :items="items" label="Delivery application menu" @invoke="value => invoked = value"><div data-example-control-row><MenubarItem value="File">File</MenubarItem><MenubarItem value="Help">Help</MenubarItem></div><MenubarContent for="File"><MenubarItem value="Archive">Archive</MenubarItem><MenubarItem value="Export">Export</MenubarItem></MenubarContent><MenubarContent for="Help"><MenubarItem value="Shortcuts">Shortcuts</MenubarItem></MenubarContent></MenubarRoot><output aria-live="polite">Invoked: {{ invoked }}</output><p>Top-level choices lead to nested actions. Activation only updates this preview.</p></div>
</template>
