<script setup lang="ts">
import { ToastClose, ToastDescription, ToastPortal, ToastProvider, ToastRoot, ToastTitle, ToastViewport } from '@sectile/vue/toast';
let generation = 0;
</script>

<template>
  <div><ToastProvider v-slot="notifications" :default-duration-ms="5000" :max-visible="3" :hotkey="false"><button type="button" @click="notifications.toast({ id: `saved-${++generation}`, title: 'Preferences saved', description: 'This is demonstration feedback.' })">Show saved notification</button><ToastPortal><ToastViewport class="docs-example-toast-viewport" label="Preview notifications"><ToastRoot v-for="toast in notifications.toasts" :key="toast.id" :value="toast.id"><ToastTitle /><ToastDescription /><ToastClose>Dismiss notification</ToastClose></ToastRoot></ToastViewport></ToastPortal><output aria-live="polite">{{ notifications.toasts.length }} notifications</output></ToastProvider><p>Notifications expire after five seconds and can be dismissed explicitly. At most three are visible.</p></div>
</template>
