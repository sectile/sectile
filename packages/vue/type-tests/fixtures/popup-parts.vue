<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { AlertDialogTrigger } from '@sectile/vue/alert-dialog';
import { DialogContent } from '@sectile/vue/dialog';
import { DrawerHandle } from '@sectile/vue/drawer';
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from '@sectile/vue/popover';
import { TooltipContent } from '@sectile/vue/tooltip';

const popup = useTemplateRef<InstanceType<typeof PopoverRoot>>('popup');
const close = () => popup.value?.requestClose();
</script>

<template>
  <PopoverRoot ref="popup" strategy="fixed" @after-close="close" v-slot="{ open }">
    <PopoverAnchor as-child><button>{{ open }}</button></PopoverAnchor>
    <PopoverPortal to="#overlay"><PopoverContent id="panel">Panel</PopoverContent></PopoverPortal>
  </PopoverRoot>
  <!-- @vue-expect-error asChild is Boolean. -->
  <AlertDialogTrigger :as-child="123" />
  <!-- @vue-expect-error asChild is Boolean. -->
  <DialogContent :as-child="123" />
  <!-- @vue-expect-error asChild is Boolean. -->
  <DrawerHandle :as-child="123" />
  <!-- @vue-expect-error Position strategy is a closed choice. -->
  <PopoverRoot strategy="floating" />
  <!-- @vue-expect-error asChild is Boolean. -->
  <PopoverAnchor :as-child="123" />
  <!-- @vue-expect-error Portal target must be a selector or Element. -->
  <PopoverPortal :to="123" />
  <!-- @vue-expect-error asChild is Boolean. -->
  <TooltipContent :as-child="123" />
</template>
