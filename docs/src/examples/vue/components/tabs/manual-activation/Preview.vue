<script setup lang="ts">
import { ref } from 'vue';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';

const sections = ['Overview', 'Activity', 'Billing'];
const selected = ref('Overview');
</script>

<template>
  <div>
    <TabsRoot v-model="selected" :items="sections" :disabled-items="['Billing']" activation-mode="manual">
      <TabsList label="Project sections">
        <TabsTrigger v-for="section in sections" :key="section" :value="section">{{ section }}</TabsTrigger>
      </TabsList>
      <TabsContent value="Overview"><p>Project settings and delivery preferences.</p></TabsContent>
      <TabsContent value="Activity"><p>Recent changes to this project.</p></TabsContent>
      <TabsContent value="Billing"><p>Billing is unavailable for this project.</p></TabsContent>
    </TabsRoot>
    <output aria-live="polite">Selected: {{ selected }}</output>
  </div>
</template>
