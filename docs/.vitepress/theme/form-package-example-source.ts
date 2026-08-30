const source = (korean: boolean): string => `<script setup lang="ts">
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
} from '@sectile/vue/form'
import {
  SelectContent,
  SelectItem,
  SelectRoot,
  SelectTrigger,
  SelectValue,
} from '@sectile/vue/select'
import { TextField } from '@sectile/vue/text'
import { nextTick, reactive, ref } from 'vue'

const savedMessage = ref('')
const timezones = ['Asia/Seoul', 'Europe/London', 'America/New_York']
const initialProfile = {
  displayName: 'Mina Kim',
  email: 'mina@sectile.dev',
  timezone: 'Asia/Seoul',
}
const profile = reactive({ ...initialProfile })
const baseline = ref({ ...initialProfile })
const controlRevision = ref(0)
const timezoneLabels: Record<string, string> = {
  'Asia/Seoul': 'Seoul · UTC+09:00',
  'Europe/London': 'London · UTC+01:00',
  'America/New_York': 'New York · UTC−04:00',
}
const timezoneLabel = (value: string) => timezoneLabels[value] ?? value
const submission = defineFormSubmission({
  onSubmit: async ({ formData, reinitialize }) => {
    await saveProfile(formData)
    baseline.value = { ...profile }
    reinitialize()
    savedMessage.value = '${korean ? '프로필을 저장했습니다.' : 'Profile saved.'}'
  },
})

const resetExample = async (reinitialize: () => void) => {
  Object.assign(profile, baseline.value)
  controlRevision.value += 1
  savedMessage.value = ''
  await nextTick()
  reinitialize()
}
</script>

<template>
  <FormRoot
    v-slot="{ dirty, touched, valid, submission, reinitialize }"
    v-bind="submission"
    autocomplete="off"
  >
    <FormSummary />

    <div :key="controlRevision">
      <FormField :name="['profile', 'displayName']" required>
        <FormLabel>${korean ? '표시 이름' : 'Display name'}</FormLabel>
        <TextField v-model="profile.displayName" minlength="2" autocomplete="off" />
        <FormDescription>${korean ? '승인 내역과 배포 기록에 표시됩니다.' : 'Shown in approvals and release activity.'}</FormDescription>
        <FormMessage />
      </FormField>

      <FormField :name="['profile', 'email']" required>
        <FormLabel>${korean ? '이메일 주소' : 'Email address'}</FormLabel>
        <TextField v-model="profile.email" type="email" autocomplete="off" />
        <FormMessage />
      </FormField>

      <FormField :name="['profile', 'timezone']" required>
        <FormLabel>${korean ? '시간대' : 'Timezone'}</FormLabel>
        <SelectRoot
          :items="timezones"
          :text-value="timezoneLabel"
          v-model="profile.timezone"
          label="${korean ? '시간대' : 'Timezone'}"
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="timezone in timezones" :key="timezone" :value="timezone">
              {{ timezoneLabel(timezone) }}
            </SelectItem>
          </SelectContent>
        </SelectRoot>
        <FormDescription>${korean ? 'Sectile Select도 같은 폼 상태와 제출에 참여합니다.' : 'Sectile Select participates in the same state and submission.'}</FormDescription>
        <FormMessage />
      </FormField>
    </div>

    <p v-if="savedMessage" role="status">{{ savedMessage }}</p>
    <FormReset @click.prevent="resetExample(reinitialize)">
      ${korean ? '되돌리기' : 'Reset'}
    </FormReset>
    <FormSubmit :disabled="!dirty || submission.status === 'submitting'">
      {{ submission.status === 'submitting' ? '${korean ? '저장 중…' : 'Saving…'}' : '${korean ? '프로필 저장' : 'Save profile'}' }}
    </FormSubmit>

    <aside aria-live="polite">
      <code>dirty: {{ dirty }}</code>
      <code>touched: {{ touched }}</code>
      <code>valid: {{ valid }}</code>
      <code>submission.status: {{ submission.status }}</code>
    </aside>
  </FormRoot>
</template>`;

export const formPackageExampleSources = Object.freeze({ vue: source(false) });
export const koFormPackageExampleSources = Object.freeze({ vue: source(true) });
