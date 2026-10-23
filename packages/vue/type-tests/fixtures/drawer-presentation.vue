<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue';
import { DrawerRoot, DrawerContent } from '@sectile/vue/drawer';
import type { DrawerRootProps, DrawerPresentation } from '@sectile/vue/drawer';

const root = useTemplateRef<InstanceType<typeof DrawerRoot>>('root');
const props = shallowRef<DrawerRootProps>({ presentation: 'inline', unmountOnExit: false });
function acceptPlacement(placement: DrawerPresentation): string { return placement; }
root.value?.requestClose();
</script>

<template>
  <DrawerRoot ref="root" v-bind="props" v-slot="state">
    <DrawerContent>
      <nav aria-label="Workspace">{{ acceptPlacement(state.placement) }}</nav>
    </DrawerContent>
  </DrawerRoot>
  <!-- @vue-expect-error Inline content cannot accept an open state. -->
  <DrawerRoot presentation="inline" :unmount-on-exit="false" :open="true" />
  <!-- @vue-expect-error Inline content must explicitly be retained. -->
  <DrawerRoot presentation="inline" />
</template>
