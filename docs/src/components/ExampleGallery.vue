<script setup lang="ts">
import { examplePath, type ExampleDefinition } from '../examples/catalog.js';
import { handleRouteClick, routeHref } from '../router.js';
defineProps<{ examples: readonly ExampleDefinition[] }>();
</script>

<template>
  <div class="docs-example-grid">
    <a v-for="example in examples" :key="example.id" class="docs-example-card" :href="routeHref(examplePath(example))" @click="handleRouteClick($event, examplePath(example))">
      <div class="docs-example-card__thumbnail" aria-hidden="true">
        <div v-if="example.subject === 'Checkbox'" class="docs-thumbnail-checkbox"><span><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg></span>Notifications</div>
        <div v-else-if="example.subject === 'Dialog'" class="docs-thumbnail-dialog"><strong>Notification settings</strong><span>Manage delivery preferences.</span><i>Close</i></div>
        <div v-else class="docs-thumbnail-form"><span>Email address</span><i>you@example.com</i><strong>Save preferences</strong></div>
      </div>
      <div class="docs-example-card__body"><h3>{{ example.title }}</h3><p>{{ example.description }}</p><span class="docs-example-card__type">{{ example.kind === 'styling' ? 'Styling example' : 'Behavior example' }}</span></div>
    </a>
  </div>
</template>
