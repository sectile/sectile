<script setup lang="ts">
import { ref } from 'vue';
import { MenuItem, MenuRoot, MenuSubContent } from '@sectile/vue/menu';
const items = [{ id: 'Share', parentID: null }, { id: 'Copy link', parentID: 'Share' }, { id: 'Email link', parentID: 'Share' }, { id: 'Archive', parentID: null }];
const invoked = ref('none');
</script>

<template>
  <div><MenuRoot :items="items" label="Delivery actions" @invoke="value => invoked = value"><MenuItem value="Share">Share</MenuItem><MenuSubContent for="Share"><MenuItem value="Copy link">Copy link</MenuItem><MenuItem value="Email link">Email link</MenuItem></MenuSubContent><MenuItem value="Archive">Archive</MenuItem></MenuRoot><output aria-live="polite">Invoked: {{ invoked }}</output><p>This menu is persistently visible. Share opens a submenu; leaf actions report an ID without sending or copying anything.</p></div>
</template>
