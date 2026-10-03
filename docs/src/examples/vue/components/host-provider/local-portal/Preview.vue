<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import { HostProvider } from '@sectile/vue/host-provider';
import {
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverPortal,
  PopoverRoot,
  PopoverTitle,
  PopoverTrigger,
} from '@sectile/vue/popover';

const destination = useTemplateRef<HTMLElement>('destination');
const open = ref(false);
</script>

<template>
  <div>
    <HostProvider :portal-target="destination ?? 'body'">
      <PopoverRoot v-model:open="open" :position="false">
        <PopoverTrigger :disabled="!destination">
          Open local details
          <svg data-example-expand-icon viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="m4 6 4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </PopoverTrigger>
        <PopoverPortal v-if="destination">
          <PopoverContent class="docs-example-popover-content">
            <PopoverTitle>Local delivery details</PopoverTitle>
            <PopoverDescription>
              This content lives in the application destination below, not beside the trigger or
              under body.
            </PopoverDescription>
            <PopoverClose>Close local details</PopoverClose>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </HostProvider>
    <section
      ref="destination"
      data-example-portal-destination
      aria-label="Application portal destination"
    >
      <p>Application portal destination</p>
    </section>
    <output aria-live="polite">Open: {{ open }}</output>
    <p>
      The provider supplies one target for descendant portals; a portal's own to prop can override
      it. The template ref is available after mounting, so the trigger waits for the target.
      Floating positioning is disabled here to show ordinary document flow; a custom portal target
      does not itself define positioning.
    </p>
  </div>
</template>
