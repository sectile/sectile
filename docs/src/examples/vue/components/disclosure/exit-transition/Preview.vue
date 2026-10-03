<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '@sectile/vue/disclosure';

const open = ref(true);
const stage = ref<HTMLElement>();
const presence = ref('Present');
let observer: MutationObserver | undefined;

onMounted(() => {
  const panel = stage.value?.querySelector<HTMLElement>('[data-part="content"]');
  if (!panel) return;
  const refresh = () => {
    presence.value = panel.hidden
      ? 'Hidden'
      : panel.hasAttribute('inert')
        ? 'Exiting · inert'
        : 'Present';
  };
  refresh();
  observer = new MutationObserver(refresh);
  observer.observe(panel, { attributes: true, attributeFilter: ['hidden', 'inert'] });
});
onBeforeUnmount(() => {
  observer?.disconnect();
  observer = undefined;
});
</script>

<template>
  <div ref="stage" class="presence-demo">
    <DisclosureRoot v-model="open">
      <DisclosureTrigger class="presence-demo__trigger">
        {{ open ? 'Hide details' : 'Show details' }}
      </DisclosureTrigger>
      <div class="presence-demo__stage">
        <DisclosureContent class="presence-demo__panel">
          <strong>Delivery preferences</strong>
          <p>
            This panel fades out before it becomes hidden. Reopen it during the fade to reverse the
            transition.
          </p>
        </DisclosureContent>
      </div>
    </DisclosureRoot>
    <output class="presence-demo__status" aria-live="polite">
      Open: {{ open }} · {{ presence }}
    </output>
  </div>
</template>
