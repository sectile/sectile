<script setup lang="ts">
import { TooltipContent, TooltipPortal, TooltipRoot, TooltipTrigger } from '@sectile/vue/tooltip';
</script>

<template>
  <div><TooltipRoot><TooltipTrigger>Archive message</TooltipTrigger><TooltipPortal><TooltipContent class="docs-example-tooltip-content">Moves a message out of your inbox.</TooltipContent></TooltipPortal></TooltipRoot><p>Hover over the button or focus it with the keyboard. The tooltip contains supplementary text, not interactive controls.</p></div>
</template>
