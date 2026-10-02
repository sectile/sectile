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
.presence-demo { width: min(100%, 360px); color: #3c3c43; }
.presence-demo__trigger {
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid #8b8b90;
  border-radius: 7px;
  background: white;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.presence-demo__trigger:focus-visible { outline: 2px solid #4659d4; outline-offset: 3px; }
.presence-demo__stage { min-height: 176px; padding-top: 16px; }
.presence-demo__panel {
  padding: 24px;
  border-radius: 7px;
  background: white;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 600ms ease-out, transform 600ms ease-out;
}
.presence-demo__panel[data-state="closed"] { opacity: 0; transform: translateY(-8px); }
.presence-demo__panel p {
  margin: 8px 0 0;
  color: #67676c;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
}
.presence-demo__status {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  font-size: 13px;
  color: #67676c;
}
@media (prefers-reduced-motion: reduce) {
  .presence-demo__panel { transition: none; }
}
</style>
