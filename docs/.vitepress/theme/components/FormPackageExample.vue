<script setup lang="ts">
import { Check, CheckCircle2, ChevronDown } from '@lucide/vue';
import {
  FormDescription,
  FormField,
  FormLabel,
  FormMessage,
  FormReset,
  FormRoot,
  FormSubmit,
  FormSummary,
  defineFormSubmission,
} from '@sectile/vue/form';
import {
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@sectile/vue/select';
import { TextField } from '@sectile/vue/text';
import { computed, nextTick, reactive, ref } from 'vue';
import {
  formPackageExampleSources,
  koFormPackageExampleSources,
} from '../form-package-example-source.js';
import { useDocsLocale } from '../locale.js';
import ExampleFrame from './ExampleFrame.vue';

const { isKorean } = useDocsLocale();
const savedMessage = ref('');
const timezoneIDs = ['Asia/Seoul', 'Europe/London', 'America/New_York'] as const;
interface ProfileDraft {
  displayName: string;
  email: string;
  timezone: (typeof timezoneIDs)[number] | null;
}
const initialProfile: Readonly<ProfileDraft> = Object.freeze({
  displayName: 'Mina Kim',
  email: 'mina@sectile.dev',
  timezone: 'Asia/Seoul',
});
const profile = reactive<ProfileDraft>({ ...initialProfile });
const baseline = ref<ProfileDraft>({ ...initialProfile });
const controlRevision = ref(0);
const timezoneLabels: Readonly<Record<(typeof timezoneIDs)[number], string>> = Object.freeze({
  'Asia/Seoul': 'Seoul · UTC+09:00',
  'Europe/London': 'London · UTC+01:00',
  'America/New_York': 'New York · UTC−04:00',
});
const timezoneLabel = (value: string): string => timezoneLabels[value as keyof typeof timezoneLabels] ?? value;

const copy = computed(() => isKorean.value ? {
  title: '워크스페이스 프로필',
  description: '입력값을 바꾼 뒤 Form이 상태를 어떻게 묶어 다루는지 확인해 보세요.',
  displayName: '표시 이름',
  displayNameHelp: '승인 내역과 배포 기록에 표시됩니다.',
  email: '이메일 주소',
  emailHelp: '계정 알림을 받을 주소입니다.',
  timezone: '시간대',
  timezoneHelp: 'Sectile Select도 같은 폼 상태와 제출에 참여합니다.',
  reset: '되돌리기',
  save: '프로필 저장',
  saving: '저장 중…',
  saved: '프로필을 저장했습니다.',
  stateTitle: '현재 Form 상태',
  stateDescription: '필드를 조작하면 아래 값이 바로 바뀝니다.',
  clean: '저장된 값과 같습니다',
  changed: '저장하지 않은 변경이 있습니다',
} : {
  title: 'Workspace profile',
  description: 'Change a value to see how Form coordinates the whole submission.',
  displayName: 'Display name',
  displayNameHelp: 'Shown in approvals and release activity.',
  email: 'Email address',
  emailHelp: 'Receives account notifications.',
  timezone: 'Timezone',
  timezoneHelp: 'Sectile Select participates in the same state and submission.',
  reset: 'Reset',
  save: 'Save profile',
  saving: 'Saving…',
  saved: 'Profile saved.',
  stateTitle: 'Current Form state',
  stateDescription: 'These values update as you interact with the fields.',
  clean: 'Matches the saved baseline',
  changed: 'Contains unsaved changes',
});

const submission = defineFormSubmission({
  onSubmit: async ({ reinitialize }) => {
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    baseline.value = { ...profile };
    reinitialize();
    savedMessage.value = copy.value.saved;
  },
});

const resetExample = async (reinitialize: () => void): Promise<void> => {
  Object.assign(profile, baseline.value);
  controlRevision.value += 1;
  savedMessage.value = '';
  await nextTick();
  reinitialize();
};
</script>

<template>
  <ExampleFrame
    fixed-host="vue"
    :sources="formPackageExampleSources"
    :ko-sources="koFormPackageExampleSources"
  >
    <FormRoot
      v-slot="{ dirty, touched, valid, submission, reinitialize }"
      v-bind="submission"
      class="form-workbench"
      autocomplete="off"
    >
      <section class="form-workbench__editor">
        <header class="form-workbench__header">
          <h3>{{ copy.title }}</h3>
          <p>{{ copy.description }}</p>
        </header>

        <FormSummary class="form-workbench__summary" />

        <div :key="controlRevision" class="form-workbench__fields">
          <FormField :name="['profile', 'displayName']" required class="form-workbench__field">
            <FormLabel>{{ copy.displayName }}</FormLabel>
            <TextField v-model="profile.displayName" minlength="2" autocomplete="off" />
            <FormDescription>{{ copy.displayNameHelp }}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField :name="['profile', 'email']" required class="form-workbench__field">
            <FormLabel>{{ copy.email }}</FormLabel>
            <TextField v-model="profile.email" type="email" autocomplete="off" />
            <FormDescription>{{ copy.emailHelp }}</FormDescription>
            <FormMessage />
          </FormField>

          <FormField :name="['profile', 'timezone']" required class="form-workbench__field">
            <FormLabel>{{ copy.timezone }}</FormLabel>
            <SelectRoot
              :items="timezoneIDs"
              :text-value="timezoneLabel"
              v-model="profile.timezone"
              :label="copy.timezone"
            >
              <SelectTrigger class="form-workbench__select-trigger">
                <SelectValue v-slot="{ value }">
                  {{ value === null ? copy.timezone : timezoneLabel(value) }}
                </SelectValue>
                <ChevronDown :size="16" aria-hidden="true" />
              </SelectTrigger>
              <SelectContent class="form-workbench__select-content">
                <SelectItem
                  v-for="timezone in timezoneIDs"
                  :key="timezone"
                  :value="timezone"
                  class="form-workbench__select-item"
                >
                  <span>{{ timezoneLabel(timezone) }}</span>
                  <SelectItemIndicator><Check :size="15" aria-hidden="true" /></SelectItemIndicator>
                </SelectItem>
              </SelectContent>
            </SelectRoot>
            <FormDescription>{{ copy.timezoneHelp }}</FormDescription>
            <FormMessage />
          </FormField>
        </div>

        <div class="form-workbench__footer">
          <p v-if="savedMessage" class="form-workbench__saved" role="status">
            <CheckCircle2 :size="16" aria-hidden="true" />
            {{ savedMessage }}
          </p>
          <span v-else class="form-workbench__baseline" :data-dirty="dirty ? '' : undefined">
            {{ dirty ? copy.changed : copy.clean }}
          </span>
          <div class="form-workbench__actions">
            <FormReset class="form-workbench__reset" @click.prevent="resetExample(reinitialize)">
              {{ copy.reset }}
            </FormReset>
            <FormSubmit
              class="form-workbench__submit"
              :disabled="!dirty || submission.status === 'submitting'"
            >
              {{ submission.status === 'submitting' ? copy.saving : copy.save }}
            </FormSubmit>
          </div>
        </div>
      </section>

      <aside class="form-workbench__state" aria-live="polite">
        <div>
          <h4>{{ copy.stateTitle }}</h4>
          <p>{{ copy.stateDescription }}</p>
        </div>
        <dl>
          <div>
            <dt>dirty</dt>
            <dd :data-active="dirty ? '' : undefined">{{ dirty }}</dd>
          </div>
          <div>
            <dt>touched</dt>
            <dd :data-active="touched ? '' : undefined">{{ touched }}</dd>
          </div>
          <div>
            <dt>valid</dt>
            <dd :data-active="valid ? '' : undefined">{{ valid }}</dd>
          </div>
          <div class="form-workbench__state-row--stacked">
            <dt>submission.status</dt>
            <dd :data-active="submission.status !== 'idle' ? '' : undefined">{{ submission.status }}</dd>
          </div>
          <div>
            <dt>submission.count</dt>
            <dd :data-active="submission.count > 0 ? '' : undefined">{{ submission.count }}</dd>
          </div>
        </dl>
      </aside>
    </FormRoot>
  </ExampleFrame>
</template>

<style scoped>
.form-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(14rem, .65fr);
  min-height: 34rem;
  color: var(--vp-c-text-1);
}

.form-workbench__editor {
  display: flex;
  flex-direction: column;
  padding: clamp(1.25rem, 3vw, 2rem);
}

.form-workbench__header {
  max-width: 34rem;
  margin-bottom: 1.5rem;
}

.form-workbench__header h3,
.form-workbench__state h4,
.form-workbench__header p,
.form-workbench__state p {
  margin: 0;
}

.form-workbench__header h3 {
  font-size: 1.35rem;
  letter-spacing: -.025em;
}

.form-workbench__header p,
.form-workbench__state p,
.form-workbench__field :deep([data-part="description"]) {
  color: var(--vp-c-text-2);
  line-height: 1.55;
}

.form-workbench__header p {
  margin-top: .4rem;
  font-size: .9rem;
}

.form-workbench__summary {
  margin-bottom: 1rem;
  padding: .75rem .875rem;
  border: 1px solid var(--vp-c-danger-2);
  border-radius: .625rem;
  color: var(--vp-c-danger-1);
  font-size: .875rem;
}

.form-workbench__fields {
  display: grid;
  gap: 1.1rem;
}

.form-workbench__field {
  display: grid;
  gap: .4rem;
}

.form-workbench__field :deep([data-part="label"]) {
  width: fit-content;
  font-size: .875rem;
  font-weight: 650;
}

.form-workbench__field :deep(input),
.form-workbench__select-trigger {
  width: 100%;
  min-height: 2.75rem;
  padding: 0 .8rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .625rem;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font: inherit;
  caret-color: var(--vp-c-brand-1);
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.form-workbench__field :deep(input:hover),
.form-workbench__select-trigger:hover {
  border-color: var(--vp-c-text-3);
}

.form-workbench__field :deep(input:focus-visible),
.form-workbench__select-trigger:focus-visible,
.form-workbench__actions button:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.form-workbench__select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  text-align: left;
}

.form-workbench__select-content {
  z-index: 40;
  min-width: var(--sectile-select-trigger-width, 15rem);
  gap: .2rem;
  padding: .35rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .625rem;
  background: var(--vp-c-bg);
  box-shadow: 0 .75rem 2rem rgb(28 28 36 / .12);
}

.form-workbench__select-content:not([hidden]) {
  display: grid;
}

.form-workbench__select-item {
  display: flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: .45rem .6rem;
  border-radius: .45rem;
  font-size: .82rem;
  outline: none;
}

.form-workbench__select-item[data-highlighted] {
  background: var(--vp-c-bg-soft);
}

.form-workbench__select-item[data-state="checked"] {
  color: var(--vp-c-brand-1);
}

.form-workbench__field :deep([data-part="description"]),
.form-workbench__field :deep([data-part="message"]) {
  font-size: .78rem;
}

.form-workbench__field :deep([data-part="message"]) {
  color: var(--vp-c-danger-1);
}

.form-workbench__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
  padding-top: 1.75rem;
}

.form-workbench__saved,
.form-workbench__baseline {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: .8rem;
}

.form-workbench__saved {
  display: inline-flex;
  align-items: center;
  gap: .4rem;
  color: var(--demo-success, #16856b);
  font-weight: 650;
}

.form-workbench__baseline[data-dirty] {
  color: var(--vp-c-text-1);
}

.form-workbench__actions {
  display: flex;
  gap: .6rem;
}

.form-workbench__actions button {
  min-height: 2.5rem;
  padding: 0 .9rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: .625rem;
  font: inherit;
  font-size: .85rem;
  font-weight: 650;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease;
}

.form-workbench__reset {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.form-workbench__reset:hover {
  background: var(--vp-c-bg-soft);
}

.form-workbench__submit {
  border-color: var(--vp-c-brand-1) !important;
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}

.form-workbench__submit:hover:not(:disabled) {
  background: var(--vp-c-brand-2);
}

.form-workbench__submit:disabled {
  border-color: var(--vp-c-divider) !important;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-3);
  cursor: not-allowed;
}

.form-workbench__state {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1.5rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.form-workbench__state h4 {
  font-size: .9rem;
}

.form-workbench__state p {
  margin-top: .4rem;
  font-size: .78rem;
}

.form-workbench__state dl {
  display: grid;
  gap: 0;
  margin: 0;
}

.form-workbench__state dl div {
  display: grid;
  grid-template-columns: minmax(0, 1fr) max-content;
  align-items: center;
  gap: .75rem;
  padding: .65rem 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.form-workbench__state dt,
.form-workbench__state dd {
  min-width: 0;
  margin: 0;
  font-family: var(--vp-font-family-mono);
  font-size: .75rem;
  font-variant-numeric: tabular-nums;
}

.form-workbench__state dt {
  white-space: nowrap;
}

.form-workbench__state dd {
  justify-self: end;
  color: var(--vp-c-text-2);
  text-align: end;
}

.form-workbench__state dl .form-workbench__state-row--stacked {
  grid-template-columns: minmax(0, 1fr);
  gap: .25rem;
}

.form-workbench__state dd[data-active] {
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

@media (max-width: 720px) {
  .form-workbench {
    grid-template-columns: minmax(0, 1fr);
  }

  .form-workbench__state {
    border-top: 1px solid var(--vp-c-divider);
    border-left: 0;
  }

  .form-workbench__footer {
    align-items: stretch;
    flex-direction: column;
  }

  .form-workbench__actions,
  .form-workbench__actions button {
    flex: 1;
  }
}
</style>
