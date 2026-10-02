<script setup lang="ts">
import { ref } from 'vue';
import { ToolbarItem, ToolbarRoot } from '@sectile/vue/toolbar';
const actions = ['Archive', 'Forward', 'Print'];
const lastAction = ref('none');
</script>

<template>
  <div><ToolbarRoot :items="actions" :disabled-items="['Print']" label="Message actions" data-example-control-row @invoke="value => lastAction = value"><ToolbarItem v-for="action in actions" :key="action" :value="action">{{ action }}{{ action === 'Print' ? ' · unavailable' : '' }}</ToolbarItem></ToolbarRoot><output aria-live="polite">Last action: {{ lastAction }}</output><p>Arrow keys move within the toolbar. Activation reports an action; this demonstration does not archive or send a message.</p></div>
</template>
