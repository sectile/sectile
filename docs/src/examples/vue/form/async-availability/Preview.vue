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
} from '@sectile/vue/form';
import { validateEmailAvailability } from './example.js';

const saved = ref('');
</script>

<template>
  <div>
    <FormRoot
      v-slot="{ validation }"
      :validate="validateEmailAvailability"
      :validate-on="['input']"
      :on-submit="
        (event) => {
          event.preventDefault();
          saved = String(event.formData.get('email') ?? '');
          return { ok: true };
        }
      "
      @reset="saved = ''"
    >
      <FormField name="email">
        <FormLabel>Available notification email</FormLabel>
        <input
          type="email"
          name="email"
          required
          autocomplete="email"
          placeholder="you@example.com"
        />
        <FormDescription>
          Try reserved@example.com, then change it before the check finishes.
        </FormDescription>
        <FormMessage />
      </FormField>
      <p role="status">
        {{
          validation.status === 'validating'
            ? 'Checking availability…'
            : `Validation: ${validation.status}`
        }}
      </p>
      <div class="docs-example-form-actions">
        <FormSubmit :disabled="validation.status === 'validating'">Save email</FormSubmit>
        <FormReset>Reset</FormReset>
      </div>
    </FormRoot>
    <p class="docs-example-form-result" role="status">
      {{ saved ? `Saved: ${saved}` : 'No accepted submission yet.' }}
    </p>
    <p>
      The local check takes 600ms. Each validation uses the supplied AbortSignal: canceled work
      removes its timer and listener. Reset or a newer validation cancels the previous result. In a
      network-backed validator, pass this signal to fetch instead.
    </p>
  </div>
</template>
