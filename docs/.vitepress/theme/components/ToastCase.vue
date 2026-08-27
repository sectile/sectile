<script setup lang="ts">
import { computed, ref } from 'vue';
import { CheckCircle2, CircleAlert, CircleX, X } from '@lucide/vue';
import { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from '@sectile/vue/toast';
import DemoCard from './DemoCard.vue'; import type { EventEntry } from '../types.js';
const props = withDefaults(defineProps<{ readonly title: string; readonly description: string; readonly persistent?: boolean; readonly maxVisible?: number; readonly preview?: boolean }>(), { persistent: false, maxVisible: 3, preview: false });
const previewToasts = Object.freeze([
  Object.freeze({ id: 'gallery-preview', title: 'Release saved', description: 'Version 0.2.0 is ready to publish.', kind: 'success' as const, durationMs: null }),
]);
const revision = ref(0); const sequence = ref(0); const entries = ref<EventEntry[]>([]);
const state = computed(() => ({ persistent: props.persistent, maxVisible: props.maxVisible }));
const code = `<script setup lang="ts">
import { ToastClose, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from '@sectile/vue/toast'
<\/script>
<template>
  <ToastProvider v-slot="{ toasts, toast }">
    <button @click="toast({ id: 'saved', title: 'Saved', kind: 'success' })">Notify</button>
    <ToastViewport>
      <ToastRoot v-for="item in toasts" :key="item.id" :value="item.id">
        <ToastTitle /><ToastClose>Dismiss</ToastClose>
      </ToastRoot>
    </ToastViewport>
  </ToastProvider>
</template>`;
function notify(push: (input: { id: string; title: string; description: string; kind: 'success' | 'warning' | 'error'; durationMs?: number | null }) => void, kind: 'success' | 'warning' | 'error'): void { sequence.value += 1; const id = `${kind}-${sequence.value}`; push({ id, title: kind === 'success' ? 'Release saved' : kind === 'warning' ? 'Review required' : 'Deployment failed', description: kind === 'success' ? 'Version 0.2.0 is ready to publish.' : kind === 'warning' ? 'A teammate requested your approval.' : 'Open the build log to review the failure.', kind, ...(props.persistent ? { durationMs: null } : {}) }); revision.value += 1; entries.value = [{ revision: revision.value, event: 'push', accepted: true, effects: [`announce-toast id=${id}`] }, ...entries.value].slice(0, 12); }
</script>
<template>
  <DemoCard :title="title" :revision="revision" :state="state" :entries="entries" interaction="enabled" :code="code">
    <ToastProvider :initial-toasts="preview ? previewToasts : []" :default-duration-ms="preview || persistent ? null : 5000" :max-visible="maxVisible" v-slot="{ toasts, toast, dismissAll }">
      <div class="toast-example" :class="{ 'toast-example--preview': preview }">
        <p v-if="!preview" class="demo-copy">{{ description }}</p>
        <div v-if="!preview" class="toast-actions"><button type="button" class="secondary" @click="notify(toast, 'success')">Save release</button><button type="button" class="secondary" @click="notify(toast, 'warning')">Warn</button><button type="button" class="secondary" @click="notify(toast, 'error')">Fail</button><button type="button" class="secondary" @click="dismissAll">Dismiss all</button></div>
        <ToastViewport class="toast-viewport" aria-label="Notifications">
          <ToastRoot v-for="item in toasts" :key="item.id" :value="item.id" class="toast-item">
            <span class="toast-status-icon" aria-hidden="true">
              <CheckCircle2 v-if="item.kind === 'success'" :size="19" />
              <CircleAlert v-else-if="item.kind === 'warning'" :size="19" />
              <CircleX v-else :size="19" />
            </span>
            <div class="toast-copy"><ToastTitle /><ToastDescription /></div>
            <ToastClose class="toast-close" aria-label="Dismiss notification"><X :size="16" aria-hidden="true" /></ToastClose>
          </ToastRoot>
        </ToastViewport>
      </div>
    </ToastProvider>
  </DemoCard>
</template>
