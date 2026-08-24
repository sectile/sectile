<script setup lang="ts">
import { computed, ref } from 'vue';
import { Check, CheckCircle2, ChevronDown, Mail, UserPlus, UserRound } from '@lucide/vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormRoot,
  FormSubmit,
  FormSummary,
} from '@sectile/vue/form';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@sectile/vue/select';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';
import { TextField } from '@sectile/vue/text';
import DemoCard from './DemoCard.vue';

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
const savedMessage = ref('');
const channelIDs = ['all', 'mentions', 'none'] as const;
const channelLabels: Readonly<Record<(typeof channelIDs)[number], string>> = {
  all: 'All activity',
  mentions: 'Mentions and assignments',
  none: 'Do not email me',
};

const cardState = computed(() => ({ savedMessage: savedMessage.value }));

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
          <strong>{{ title }}</strong>
          <span>{{ description }}</span>
        </div>
        <span v-if="savedMessage" class="form-demo__saved" role="status">
          <CheckCircle2 :size="15" aria-hidden="true" /> {{ savedMessage }}
        </span>
      </header>

      <FormSummary v-if="state.issues.length > 0" v-slot="{ state: summaryState }" class="form-demo__summary">
        <strong>Review {{ summaryState.issues.length }} field{{ summaryState.issues.length === 1 ? '' : 's' }}.</strong>
        <span>{{ summaryState.issues.map((issue) => issue.message).join(' ') }}</span>
      </FormSummary>

      <template v-if="scenario === 'profile'">
        <div class="form-demo__fields">
          <FormField id="profile-name" :name="['profile', 'displayName']" required class="form-demo__field">
            <FormLabel><UserRound :size="15" aria-hidden="true" /> Display name</FormLabel>
            <TextField v-model.trim="displayName" minlength="2" autocomplete="name" />
            <FormDescription>Shown in approvals and release activity.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField id="profile-email" :name="['profile', 'email']" required class="form-demo__field">
            <FormLabel><Mail :size="15" aria-hidden="true" /> Email address</FormLabel>
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
            <FormLabel><Mail :size="15" aria-hidden="true" /> Activity emails</FormLabel>
            <SelectRoot
              :items="channelIDs"
              :text-value="(id) => channelLabels[id as keyof typeof channelLabels]"
              default-value="mentions"
              class="form-demo__select-root"
            >
              <SelectTrigger class="form-demo__select-trigger">
                <SelectValue />
                <ChevronDown :size="16" aria-hidden="true" />
              </SelectTrigger>
              <SelectContent class="form-demo__select-content">
                <SelectItem v-for="id in channelIDs" :key="id" :value="id" class="form-demo__select-item">
                  <span>{{ channelLabels[id] }}</span>
                  <SelectItemIndicator><Check :size="15" aria-hidden="true" /></SelectItemIndicator>
                </SelectItem>
              </SelectContent>
            </SelectRoot>
            <FormDescription>Choose which workspace activity reaches your inbox.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField :name="['notifications', 'digest']" class="form-demo__field">
            <div class="form-demo__switch-row">
              <div>
                <FormLabel>Weekly digest</FormLabel>
                <FormDescription>A Monday summary of deployments and approvals.</FormDescription>
              </div>
              <SwitchRoot value="enabled" class="form-demo__switch">
                <SwitchThumb class="form-demo__switch-thumb" />
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
            <FormLabel><UserPlus :size="15" aria-hidden="true" /> Teammate email</FormLabel>
            <input type="email" value="alex@example.com" autocomplete="email">
            <FormDescription>The invitation expires after seven days.</FormDescription>
            <FormMessage />
          </FormField>

          <FormField id="invite-role" :name="['invitation', 'role']" required class="form-demo__field">
            <FormLabel>Workspace role</FormLabel>
            <select>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
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
  width: min(100%, 44rem);
  margin: 0 auto;
  padding: 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 1rem;
  background: var(--vp-c-bg);
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
  max-width: 17rem;
  color: var(--vp-c-success-1);
  font-size: .82rem;
  font-weight: 650;
  text-align: right;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin: 1.25rem 0;
}

.form-demo__stack {
  margin: 1.25rem 0;
}

.form-demo__field :deep(label) {
  font-weight: 650;
}

.form-demo__field :deep(input),
.form-demo__field :deep(select),
.form-demo__select-trigger {
  width: 100%;
  min-height: 2.75rem;
  padding: 0 .8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .65rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
}

.form-demo__field :deep(input:focus-visible),
.form-demo__field :deep(select:focus-visible),
.form-demo__select-trigger:focus-visible {
  border-color: var(--vp-c-brand-1);
  outline: 2px solid color-mix(in srgb, var(--vp-c-brand-1) 35%, transparent);
  outline-offset: 1px;
}

.form-demo__select-root { position: relative; }

.form-demo__select-trigger,
.form-demo__select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
}

.form-demo__select-content {
  position: absolute;
  z-index: 2;
  top: calc(100% + .35rem);
  right: 0;
  left: 0;
  padding: .35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .75rem;
  background: var(--vp-c-bg);
  box-shadow: var(--vp-shadow-3);
}

.form-demo__select-item {
  min-height: 2.5rem;
  padding: 0 .65rem;
  border-radius: .5rem;
}

.form-demo__select-item[data-highlighted] { background: var(--vp-c-bg-soft); }

.form-demo__switch-row {
  padding: .85rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .75rem;
}

.form-demo__switch {
  display: inline-flex;
  width: 2.75rem;
  height: 1.55rem;
  flex: 0 0 auto;
  align-items: center;
  padding: .15rem;
  border: 0;
  border-radius: 999px;
  background: var(--vp-c-default-soft);
}

.form-demo__switch[data-state="checked"] { background: var(--vp-c-brand-1); }

.form-demo__switch-thumb {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  background: white;
  box-shadow: var(--vp-shadow-1);
  transition: transform .16s ease;
}

.form-demo__switch[data-state="checked"] .form-demo__switch-thumb { transform: translateX(1.2rem); }

.form-demo__field :deep([data-part="message"]:not([hidden])) { color: var(--vp-c-danger-1); }

.form-demo__actions { justify-content: flex-end; }

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
  .form-demo__fields,
  .form-demo__invite { grid-template-columns: 1fr; }
  .form-demo__header { align-items: flex-start; }
}
</style>
