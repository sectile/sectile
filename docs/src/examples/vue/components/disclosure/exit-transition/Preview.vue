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
    presence.value = panel.hidden ? 'Hidden' : panel.hasAttribute('inert') ? 'Exiting · inert' : 'Present';
  };
  refresh();
  observer = new MutationObserver(refresh);
  observer.observe(panel, { attributes: true, attributeFilter: ['hidden', 'inert'] });
});
onBeforeUnmount(() => { observer?.disconnect(); observer = undefined; });
</script>

<template>
  <div ref="stage" class="presence-demo">
    <DisclosureRoot v-model="open">
      <DisclosureTrigger class="presence-demo__trigger">{{ open ? 'Hide details' : 'Show details' }}</DisclosureTrigger>
      <div class="presence-demo__stage">
        <DisclosureContent class="presence-demo__panel">
          <strong>Delivery preferences</strong>
          <p>This panel fades out before it becomes hidden. Reopen it during the fade to reverse the transition.</p>
        </DisclosureContent>
      </div>
    </DisclosureRoot>
    <output class="presence-demo__status" aria-live="polite">Open: {{ open }} · {{ presence }}</output>
  </div>
</template>

<style scoped>
.presence-demo { width: min(100%, 360px); color: var(--docs-text, #171717); }
.presence-demo__trigger {
  min-height: var(--docs-control-height, 44px);
  padding: 8px 16px;
  border: 1px solid var(--docs-control-border, #8a8a8a);
  border-radius: var(--docs-control-radius, 9999px);
  background: var(--docs-bg, white);
  color: inherit;
  font: inherit;
  font-size: var(--docs-font-size-label, 14px);
  line-height: 1.5;
  cursor: pointer;
}
.presence-demo__trigger:focus-visible { outline: var(--docs-focus-width, 2px) solid var(--docs-focus, #737373); outline-offset: var(--docs-focus-offset, 2px); }
.presence-demo__stage { min-height: 176px; padding-top: 16px; }
.presence-demo__panel {
  padding: 24px;
  border-radius: var(--docs-radius, 12px);
  background: var(--docs-bg-muted, #fafafa);
  opacity: 1;
  transform: translateY(0);
  transition: opacity var(--docs-motion-presence, 600ms) ease-out, transform var(--docs-motion-presence, 600ms) ease-out;
}
.presence-demo__panel[data-state="closed"] { opacity: 0; transform: translateY(-8px); }
.presence-demo__panel p {
  margin: 8px 0 0;
  color: var(--docs-text-muted, #666666);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
}
.presence-demo__status {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  color: var(--docs-text-muted, #666666);
}
@media (prefers-reduced-motion: reduce) {
  .presence-demo__panel { transition: none; }
}
</style>
