<script setup lang="ts">
import { ref } from 'vue';
import { HostProvider } from '@sectile/vue/host-provider';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';

const direction = ref<'ltr' | 'rtl'>('rtl');
const sections = ['Overview', 'Activity'];
const selected = ref('Overview');
</script>

<template>
  <div>
    <HostProvider :direction="direction">
      <div :dir="direction">
        <TabsRoot v-model="selected" :items="sections">
          <TabsList label="Directional project sections">
            <TabsTrigger v-for="section in sections" :key="section" :value="section">
              {{ section }}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="Overview"><p>Delivery preferences.</p></TabsContent>
          <TabsContent value="Activity"><p>Recent deliveries.</p></TabsContent>
        </TabsRoot>
      </div>
    </HostProvider>
    <button
      type="button"
      data-example-direction-toggle
      @click="direction = direction === 'rtl' ? 'ltr' : 'rtl'"
    >
      Switch to {{ direction === 'rtl' ? 'LTR' : 'RTL' }}
    </button>
    <output aria-live="polite">Direction: {{ direction }} · Selected: {{ selected }}</output>
    <p>
      The provider supplies interaction direction. Set dir on application markup too: the provider
      is context, not a visual wrapper.
    </p>
  </div>
</template>
