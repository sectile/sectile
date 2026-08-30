<script setup lang="ts">
import {
  FormField,
  FormFieldSelector,
  FormRoot,
  FormSelector,
  FormSubmit,
  FormSummary,
  useFormFieldController,
  useFormFieldSelector,
  useFormSelector,
} from '../../.verification-dist/form.js';

const dirty = useFormSelector((state) => state.dirty);
dirty.value satisfies boolean;
const emailValid = useFormFieldSelector('email', (field) => field?.valid ?? true);
emailValid.value satisfies boolean;
const email = useFormFieldController('email');
email.setMeta({ dirty: true, touched: true });
email.replaceIssues('server', [{
  id: 'email-unavailable',
  fieldId: 'email',
  source: 'server',
  message: 'Unavailable',
}]);
email.clearIssues('server');

// @ts-expect-error valid is derived and cannot be assigned as field metadata.
email.setMeta({ valid: false });
</script>

<template>
  <FormRoot>
    <FormField id="email">
      <input>
    </FormField>
    <FormSelector :select="state => state.submission.status" v-slot="{ selected }">
      <output>{{ selected.toUpperCase() }}</output>
    </FormSelector>
    <FormFieldSelector id="email" :select="field => field?.issues ?? []" v-slot="{ selected }">
      <output>{{ selected.length }}</output>
    </FormFieldSelector>
    <FormSubmit v-slot="{ valid, submitting, canSubmit }">
      {{ valid.valueOf() }}
      {{ submitting.valueOf() }}
      {{ canSubmit.valueOf() }}
    </FormSubmit>
    <FormSummary v-slot="{ validation, submission, issues, serverIssues, firstIssue }">
      {{ validation.status }}
      {{ submission.failure?.message }}
      {{ issues.length }}
      {{ serverIssues.length }}
      {{ firstIssue?.message }}
    </FormSummary>
  </FormRoot>
</template>
