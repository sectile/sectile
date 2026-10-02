<script setup lang="ts">
import { ref, useId } from 'vue';
import { NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuRoot } from '@sectile/vue/navigation-menu';
const items = [{ id: 'Overview', parentID: null }, { id: 'Activity', parentID: null }];
const destinationID = useId();
const destination = ref('none');
</script>

<template>
  <div><NavigationMenuRoot :items="items" label="Project sections" @invoke="value => destination = value"><NavigationMenuList data-example-control-row><NavigationMenuItem v-for="item in items" :key="item.id"><NavigationMenuLink as="a" :value="item.id" :href="`#${destinationID}`">{{ item.id }}</NavigationMenuLink></NavigationMenuItem></NavigationMenuList></NavigationMenuRoot><output :id="destinationID" aria-live="polite">Destination: {{ destination }}</output><p>These links target the preview output. Replace their href values with application destinations; routing remains application-owned.</p></div>
</template>
