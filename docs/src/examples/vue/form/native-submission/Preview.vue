<script setup lang="ts">
import { ref } from 'vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  type FormSubmitEvent,
} from '@sectile/vue/form';

const submitted = ref('');

function submit(event: FormSubmitEvent): void {
  event.preventDefault();
  submitted.value = String(event.formData.get('email') ?? '');
}
</script>

<template>
  <div>
    <FormRoot :on-submit="submit" @reset="submitted = ''">
      <FormField name="email">
        <FormLabel>Email address</FormLabel>
        <input type="email" name="email" required autocomplete="email" placeholder="you@example.com" />
        <FormDescription>Used for deployment notifications.</FormDescription>
        <FormMessage />
      </FormField>
      <div class="docs-example-form-actions">
        <FormSubmit>Save preferences</FormSubmit>
        <FormReset>Reset</FormReset>
      </div>
    </FormRoot>
    <p class="docs-example-form-result" role="status">{{ submitted ? `Submitted email: ${submitted}` : 'No submission yet.' }}</p>
  </div>
</template>
