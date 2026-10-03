<script setup lang="ts">
import { ref } from 'vue';
import {
  MenuButtonContent,
  MenuButtonRoot,
  MenuButtonTrigger,
  MenuItem,
} from '@sectile/vue/menu-button';
const actions = [
  { id: 'Archive', parentID: null },
  { id: 'Forward', parentID: null },
  { id: 'Print', parentID: null },
];
const lastAction = ref('none');
</script>

<template>
  <div>
    <MenuButtonRoot
      :items="actions"
      :disabled-items="['Print']"
      label="Message actions"
      @invoke="(value) => (lastAction = value)"
    >
      <MenuButtonTrigger>
        Message actions
        <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="m4 6 4 4 4-4"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </MenuButtonTrigger>
      <MenuButtonContent>
        <MenuItem v-for="action in actions" :key="action.id" :value="action.id">
          {{ action.id }}{{ action.id === 'Print' ? ' · unavailable' : '' }}
        </MenuItem>
      </MenuButtonContent>
    </MenuButtonRoot>
    <output aria-live="polite">Invoked: {{ lastAction }}</output>
    <p>The menu reports an action ID. This demonstration does not archive or forward a message.</p>
  </div>
</template>
