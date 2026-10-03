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
  FormSummary,
  type FormSubmitHandler,
} from '@sectile/vue/form';
import { submitNotificationEmail, validateNotificationEmail } from './example.js';

const submitted = ref('');
const submit: FormSubmitHandler = async (event) => {
  const result = await submitNotificationEmail(event);
  if (result?.ok) submitted.value = String(event.formData.get('email') ?? '');
  return result;
};
</script>

<template>
  <div>
    <FormRoot
      :validate="validateNotificationEmail"
      :validate-on="['blur']"
      :revalidate-on="['input']"
      :on-submit="submit"
      @reset="submitted = ''"
    >
      <FormSummary />
      <FormField name="email">
        <FormLabel>Notification email</FormLabel>
        <input
          type="email"
          name="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
        />
        <FormDescription>Use blocked@example.com to see a simulated server issue.</FormDescription>
        <FormMessage />
      </FormField>
      <FormField name="confirmation">
        <FormLabel>Confirm email</FormLabel>
        <input
          type="email"
          name="confirmation"
          required
          autocomplete="off"
          placeholder="Repeat the email address"
        />
        <FormMessage />
      </FormField>
      <div class="docs-example-form-actions">
        <FormSubmit>Save notification email</FormSubmit>
        <FormReset>Reset</FormReset>
      </div>
    </FormRoot>
    <p class="docs-example-form-result" role="status">
      {{ submitted ? `Saved: ${submitted}` : 'No accepted submission yet.' }}
    </p>
    <p>
      Native email constraints run alongside cross-field validation. A failed submission returns
      field issues; reset restores the initial form and clears the local result. This example does
      not contact a server.
    </p>
  </div>
</template>
