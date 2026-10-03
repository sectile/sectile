<script setup lang="ts">
import { ref, useId } from 'vue';
import {
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
} from '@sectile/vue/navigation-menu';
const items = [
  { id: 'Overview', parentID: null },
  { id: 'Activity', parentID: null },
];
const destinationID = useId();
const destination = ref('none');
</script>

<template>
  <div>
    <NavigationMenuRoot
      :items="items"
      label="Project sections"
      @invoke="(value) => (destination = value)"
    >
      <NavigationMenuList data-example-control-row>
        <NavigationMenuItem v-for="item in items" :key="item.id">
          <NavigationMenuLink as="a" :value="item.id" :href="`#${destinationID}-${item.id}`">
            {{ item.id }}
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenuRoot>
    <section
      v-for="item in items"
      :id="`${destinationID}-${item.id}`"
      :key="item.id"
      data-example-navigation-section
    >
      <h3>{{ item.id }}</h3>
      <p>
        {{
          item.id === 'Overview'
            ? 'Three members are preparing the next delivery.'
            : 'Ada updated the delivery schedule. Grace confirmed the address.'
        }}
      </p>
    </section>
    <output aria-live="polite">Destination: {{ destination }}</output>
    <p>
      Each link navigates to its own section. Application links can use page URLs instead; routing
      remains application-owned.
    </p>
  </div>
</template>
