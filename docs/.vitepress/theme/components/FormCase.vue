<script setup lang="ts">
import { computed, ref } from 'vue';
import { CheckCircle2, Mail, UserPlus, UserRound } from '@lucide/vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
} from '@sectile/vue/form';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';
import { TextField } from '@sectile/vue/text';
import DemoCard from './DemoCard.vue';
import DemoSelect, { type DemoSelectOption } from './DemoSelect.vue';

const props = defineProps<{
  readonly title: string;
  readonly description: string;
  readonly scenario: 'profile' | 'notifications' | 'team-invite';
}>();

interface SubmitDetails {
  readonly event: SubmitEvent;
  readonly values: Readonly<Record<string, unknown>>;
}

const revision = ref(0);
const displayName = ref('Mina Kim');
const weeklyDigest = ref(true);
const savedMessage = ref('');
const channelOptions: readonly DemoSelectOption[] = Object.freeze([
  { id: 'all', label: 'All activity' },
  { id: 'mentions', label: 'Mentions and assignments' },
  { id: 'none', label: 'Do not email me' },
]);
const roleOptions: readonly DemoSelectOption[] = Object.freeze([
  { id: 'member', label: 'Member' },
  { id: 'admin', label: 'Admin' },
]);

const cardState = computed(() => ({ savedMessage: savedMessage.value }));
const panelCopy = computed(() => ({
  profile: {
    title: 'Personal profile',
    description: 'Manage the identity teammates see across the workspace.',
  },
  notifications: {
    title: 'Email notifications',
    description: 'Choose which updates arrive in your inbox.',
  },
  'team-invite': {
    title: 'Invite member',
    description: 'Add a teammate and assign their initial workspace role.',
  },
})[props.scenario]);

function submit(details: SubmitDetails): void {
  details.event.preventDefault();
  const value = details.values[props.scenario === 'team-invite' ? 'invitation' : props.scenario];
  savedMessage.value = props.scenario === 'profile'
    ? `Saved ${(value as { displayName?: string } | undefined)?.displayName ?? 'profile'}`
    : props.scenario === 'notifications'
      ? 'Notification preferences saved'
      : `Invitation sent to ${(value as { email?: string } | undefined)?.email ?? 'teammate'}`;
  revision.value += 1;
}
</script>

<template>
  <DemoCard
    :title="title"
    :revision="revision"
    :state="cardState"
    :entries="[]"
    interaction="enabled"
    code=""
  >
    <FormRoot v-slot="{ state }" class="form-demo" @submit="submit">
      <header class="form-demo__header">
        <div>
          <strong>{{ panelCopy.title }}</strong>
          <span>{{ panelCopy.description }}</span>
        </div>
      </header>

      <span v-if="savedMessage" class="form-demo__saved" role="status">
        <CheckCircle2 :size="15" aria-hidden="true" /> {{ savedMessage }}
      </span>

      <FormSummary v-if="state.issues.length > 0" v-slot="{ state: summaryState }" class="form-demo__summary">
        <strong>Review {{ summaryState.issues.length }} field{{ summaryState.issues.length === 1 ? '' : 's' }}.</strong>
        <span>{{ summaryState.issues.map((issue) => issue.message).join(' ') }}</span>
      </FormSummary>

      <template v-if="scenario === 'profile'">
        <div class="form-demo__fields">
          <FormField id="profile-name" :name="['profile', 'displayName']" required class="form-demo__field">
            <FormLabel class="form-demo__label"><UserRound :size="15" aria-hidden="true" /> Display name</FormLabel>
            <TextField v-model.trim="displayName" minlength="2" autocomplete="name" />
            <FormDescription>Shown in approvals and release activity.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField id="profile-email" :name="['profile', 'email']" required class="form-demo__field">
            <FormLabel class="form-demo__label"><Mail :size="15" aria-hidden="true" /> Email address</FormLabel>
            <TextField type="email" default-value="mina@sectile.dev" autocomplete="email" />
            <FormDescription>Receives deployment and security notifications.</FormDescription>
            <FormMessage />
          </FormField>
        </div>
        <footer class="form-demo__actions">
          <button type="reset">Reset</button>
          <FormSubmit>Save profile</FormSubmit>
        </footer>
      </template>

      <template v-else-if="scenario === 'notifications'">
        <div class="form-demo__stack">
          <FormField :name="['notifications', 'channel']" required class="form-demo__field">
            <FormLabel class="form-demo__label"><Mail :size="15" aria-hidden="true" /> Activity emails</FormLabel>
            <DemoSelect
              :options="channelOptions"
              default-value="mentions"
              label="Activity emails"
            />
            <FormDescription>Choose which workspace activity reaches your inbox.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField :name="['notifications', 'digest']" class="form-demo__field">
            <div class="form-demo__switch-row">
              <div>
                <FormLabel class="form-demo__label">Weekly digest</FormLabel>
                <FormDescription>A Monday summary of deployments and approvals.</FormDescription>
              </div>
              <SwitchRoot v-model="weeklyDigest" value="enabled" class="switch-button">
                <span class="switch-track" aria-hidden="true">
                  <SwitchThumb class="switch-thumb" />
                </span>
              </SwitchRoot>
            </div>
            <FormMessage />
          </FormField>
        </div>
        <footer class="form-demo__actions">
          <FormSubmit>Save notifications</FormSubmit>
        </footer>
      </template>

      <template v-else>
        <div class="form-demo__invite">
          <FormField id="invite-email" :name="['invitation', 'email']" required class="form-demo__field">
            <FormLabel class="form-demo__label"><UserPlus :size="15" aria-hidden="true" /> Teammate email</FormLabel>
            <TextField type="email" default-value="alex@example.com" autocomplete="email" />
            <FormDescription>The invitation expires after seven days.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField id="invite-role" :name="['invitation', 'role']" required class="form-demo__field">
            <FormLabel class="form-demo__label">Workspace role</FormLabel>
            <DemoSelect
              :options="roleOptions"
              default-value="member"
              label="Workspace role"
            />
            <FormDescription>Admins can manage members and billing.</FormDescription>
            <FormMessage />
          </FormField>
        </div>
        <footer class="form-demo__actions">
          <FormSubmit>Send invitation</FormSubmit>
        </footer>
      </template>
    </FormRoot>
  </DemoCard>
</template>

<style scoped>
.form-demo {
  width: min(100%, 48rem);
  margin: 0 auto;
  padding: 1.25rem;
  border: 1px solid var(--demo-border);
  border-radius: .75rem;
  background: var(--demo-surface);
}

.form-demo__header,
.form-demo__actions,
.form-demo__switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.form-demo__header > div,
.form-demo__field,
.form-demo__stack,
.form-demo__switch-row > div {
  display: grid;
  gap: .4rem;
}

.form-demo__header span,
.form-demo__field :deep(p) {
  color: var(--demo-muted);
  font-size: .85rem;
}

.form-demo__saved,
.form-demo__label {
  display: inline-flex;
  align-items: center;
  gap: .45rem;
}

.form-demo__saved {
  width: fit-content;
  margin-top: .8rem;
  color: var(--demo-success, #16856b);
  font-size: .82rem;
  font-weight: 650;
  text-align: left;
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

.form-demo__fields,
.form-demo__invite {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
  margin: 1.25rem 0;
}

.form-demo__stack {
  margin: 1.25rem 0;
}

.form-demo__label {
  min-height: 1.5rem;
  font-weight: 650;
}

.form-demo__field :deep(input) {
  width: 100%;
  height: 3rem;
  padding: 0 .8rem;
  border: 1px solid var(--demo-border);
  border-radius: .65rem;
  background: var(--demo-surface);
  color: var(--demo-text);
  font: inherit;
}

.form-demo__field :deep(input:focus-visible) {
  border-color: var(--demo-brand);
  outline: 2px solid var(--demo-focus);
  outline-offset: 2px;
}

.form-demo__field :deep([data-part="description"]),
.form-demo__field :deep([data-part="message"]) {
  margin: 0;
}

.form-demo__switch-row {
  min-height: 5.5rem;
  padding: 1rem;
  border: 1px solid var(--demo-border);
  border-radius: .75rem;
}

.form-demo__field :deep([data-part="message"]:not([hidden])) { color: var(--vp-c-danger-1); }

.form-demo__actions { justify-content: flex-end; }

.form-demo__actions button {
  height: 3rem;
  padding: 0 .9rem;
  border: 1px solid var(--demo-border);
  border-radius: .65rem;
  background: var(--demo-surface);
  color: var(--demo-text);
  font: inherit;
  font-weight: 650;
}

.form-demo__actions :deep([data-part="submit"]) {
  border-color: var(--demo-brand);
  background: var(--demo-brand);
  color: var(--demo-on-brand);
}

@media (max-width: 640px) {
  .form-demo__header { align-items: flex-start; }
  .form-demo__switch-row { align-items: flex-start; }
}
</style>
