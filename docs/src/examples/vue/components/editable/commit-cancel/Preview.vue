<script setup lang="ts">
import { ref } from 'vue';
import { EditableArea, EditableCancelTrigger, EditableEditTrigger, EditableInput, EditablePreview, EditableRoot, EditableSubmitTrigger } from '@sectile/vue/editable';
const name = ref('Reception delivery');
</script>

<template>
  <div><EditableRoot v-slot="editable" v-model="name" :submit-on-blur="false" label="Delivery name"><EditableArea><EditablePreview>{{ editable.value }}</EditablePreview><EditableInput /></EditableArea><div data-example-control-row><EditableEditTrigger>Edit name</EditableEditTrigger><EditableSubmitTrigger>Save name</EditableSubmitTrigger><EditableCancelTrigger>Cancel edit</EditableCancelTrigger></div></EditableRoot><output aria-live="polite">Saved name: {{ name }}</output><p>Editing creates a draft. Save commits it; Cancel discards it.</p></div>
</template>
