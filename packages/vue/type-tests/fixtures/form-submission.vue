<script setup lang="ts">
import { FormRoot, defineFormSubmission } from '../../dist/form.js';

const schema = {
  '~standard': {
    version: 1 as const,
    vendor: 'sectile-sfc-fixture',
    types: undefined as unknown as {
      readonly input: { readonly email: string };
      readonly output: { readonly userId: number; readonly email: string };
    },
    validate: (_value: unknown) => ({
      value: { userId: 7, email: 'release@sectile.dev' },
    }),
  },
};

const submission = defineFormSubmission({
  schema,
  onSubmit: ({ values, reinitialize }) => {
    values.userId satisfies number;
    values.email satisfies string;
    reinitialize({ preserve: { touched: true } });
  },
});

defineFormSubmission({
  schema,
  onSubmit: ({ values }) => {
    // @ts-expect-error Schema output userId is numeric in SFC consumers too.
    values.userId satisfies string;
  },
});
</script>

<template>
  <FormRoot v-bind="submission">
    <button type="submit">Save</button>
  </FormRoot>
</template>
