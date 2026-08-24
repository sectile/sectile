<script setup lang="ts">
import { ref } from 'vue';
import { CheckCircle2, Mail, UserRound } from '@lucide/vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
} from '@sectile/vue/form';
import DemoCard from './DemoCard.vue';

defineProps<{
  readonly title: string;
  readonly description: string;
}>();

const revision = ref(0);
const savedAccount = ref('');

function save(details: { readonly event: SubmitEvent; readonly formData: FormData }): void {
  details.event.preventDefault();
  savedAccount.value = String(details.formData.get('email') ?? '');
  revision.value += 1;
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="{ savedAccount }"
    :entries="[]"
    interaction="enabled"
    code=""
  >
    <FormRoot class="form-demo" @submit="save">
      <header class="form-demo__header">
        <div>
          <strong>Account settings</strong>
          <span>Update the profile used for release notifications.</span>
        </div>
        <span v-if="savedAccount" class="form-demo__saved">
          <CheckCircle2 :size="15" aria-hidden="true" /> Saved
        </span>
      </header>

      <FormSummary v-slot="{ state }" class="form-demo__summary">
        <strong>Review {{ state.issues.length }} field{{ state.issues.length === 1 ? '' : 's' }}.</strong>
        <span>{{ state.issues.map((issue) => issue.message).join(' ') }}</span>
      </FormSummary>

      <div class="form-demo__fields">
        <FormField id="account-name" name="name" class="form-demo__field">
          <FormLabel><UserRound :size="15" aria-hidden="true" /> Display name</FormLabel>
          <input name="name" value="Mina Kim" minlength="2" required autocomplete="name">
          <FormDescription>Shown to teammates in approvals and release activity.</FormDescription>
          <FormMessage />
        </FormField>

        <FormField id="account-email" name="email" class="form-demo__field">
          <FormLabel><Mail :size="15" aria-hidden="true" /> Email address</FormLabel>
          <input name="email" value="mina@sectile.dev" type="email" required autocomplete="email">
          <FormDescription>Receives deployment and security notifications.</FormDescription>
          <FormMessage />
        </FormField>
      </div>

      <footer class="form-demo__actions">
        <button type="reset">Reset</button>
        <FormSubmit>Save settings</FormSubmit>
      </footer>
    </FormRoot>
  </DemoCard>
</template>

<style scoped>
.form-demo {
  width: min(100%, 42rem);
  margin: 0 auto;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 1rem;
  background: var(--vp-c-bg);
}

.form-demo__header,
.form-demo__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.form-demo__header > div,
.form-demo__field {
  display: grid;
  gap: .4rem;
}

.form-demo__header span,
.form-demo__field :deep(p) {
  color: var(--vp-c-text-2);
  font-size: .85rem;
}

.form-demo__saved,
.form-demo__field :deep(label) {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
}

.form-demo__saved {
  color: var(--vp-c-success-1);
  font-weight: 650;
}

.form-demo__summary {
  display: grid;
  gap: .25rem;
  margin-top: 1rem;
  padding: .75rem .875rem;
  border: 1px solid var(--vp-c-danger-2);
  border-radius: .65rem;
  color: var(--vp-c-danger-1);
}

.form-demo__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0;
}

.form-demo__field :deep(label) {
  font-weight: 650;
}

.form-demo__field :deep(input) {
  width: 100%;
  min-height: 2.75rem;
  padding: 0 .8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .65rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.form-demo__field :deep(input:focus-visible) {
  border-color: var(--vp-c-brand-1);
  outline: 2px solid color-mix(in srgb, var(--vp-c-brand-1) 35%, transparent);
  outline-offset: 1px;
}

.form-demo__field :deep([data-part="message"]:not([hidden])) {
  color: var(--vp-c-danger-1);
}

.form-demo__actions {
  justify-content: flex-end;
}

.form-demo__actions button {
  min-height: 2.6rem;
  padding: 0 .9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .65rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
  font-weight: 650;
}

.form-demo__actions :deep([data-part="submit"]) {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: white;
}

@media (max-width: 640px) {
  .form-demo__fields { grid-template-columns: 1fr; }
}
</style>
