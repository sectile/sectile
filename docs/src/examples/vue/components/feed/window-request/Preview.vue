<script setup lang="ts">
import { ref } from 'vue';
import { FeedItem, FeedLoadNewer, FeedRoot, type FeedRequestWindowHandler } from '@sectile/vue/feed';
const items = ref(['Delivery 1', 'Delivery 2', 'Delivery 3']);
const revision = ref(0);
const generation = ref(0);
const loadNewer: FeedRequestWindowHandler = (_direction, _anchor, sourceRevision, requestGeneration) => {
  const start = items.value.length;
  items.value = [...items.value, ...Array.from({ length: Math.min(3, 15 - start) }, (_, index) => `Delivery ${start + index + 1}`)];
  revision.value = sourceRevision + 1;
  generation.value = requestGeneration;
};
</script>

<template>
  <div><FeedRoot :items="items" :revision="revision" :request-generation="generation" label="Delivery updates" @request-window="loadNewer"><FeedItem v-for="item in items" :key="item" :value="item"><strong>{{ item }}</strong><p>Delivery status updated.</p></FeedItem><FeedLoadNewer v-if="items.length < 15">Load newer updates</FeedLoadNewer></FeedRoot><output aria-live="polite">{{ items.length }} updates · Revision {{ revision }}</output><p>The local request handler returns a matching generation and a newer revision. This demonstration stops at 15 updates and does not use a network source.</p></div>
</template>
