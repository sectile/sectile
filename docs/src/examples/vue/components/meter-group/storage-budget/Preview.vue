<script setup lang="ts">
import { ref } from 'vue';
import { MeterGroupIndicator, MeterGroupItem, MeterGroupItemLabel, MeterGroupItemValue, MeterGroupList, MeterGroupRoot, MeterGroupSegment, MeterGroupTrack, MeterGroupValueText } from '@sectile/vue/meter-group';

const items = ref([
  { id: 'documents', label: 'Documents', value: 24 },
  { id: 'media', label: 'Media', value: 36 },
]);
function toggleMedia() {
  items.value = items.value.map(item => item.id === 'media'
    ? { ...item, value: item.value === 36 ? 48 : 36 }
    : item);
}
</script>

<template>
  <div data-example-meter-group>
    <MeterGroupRoot v-slot="meter" :items="items" :max="100" label="Storage used">
      <MeterGroupTrack>
        <MeterGroupSegment v-for="segment in meter.segments" :id="segment.id" :key="segment.id">
          <MeterGroupIndicator />
        </MeterGroupSegment>
      </MeterGroupTrack>
      <MeterGroupValueText />
      <MeterGroupList>
        <MeterGroupItem v-for="segment in meter.segments" :id="segment.id" :key="segment.id">
          <MeterGroupItemLabel />: <MeterGroupItemValue />
        </MeterGroupItem>
      </MeterGroupList>
      <p>{{ meter.remaining }} units remaining. Labels identify the segments without relying on color.</p>
    </MeterGroupRoot>
    <button type="button" @click="toggleMedia">Change media usage</button>
  </div>
</template>
