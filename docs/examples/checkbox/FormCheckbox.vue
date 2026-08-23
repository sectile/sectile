<script setup lang="ts">
import { Check } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { ref } from 'vue';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

const result = ref<string | null>(null);
const { isKorean } = useDocsLocale();

function submit(event: Event): void {
  const data = new FormData(event.currentTarget as HTMLFormElement);
  result.value = data.has('notifications')
    ? (isKorean.value ? 'notifications=release가 제출되었습니다.' : 'Submitted notifications=release.')
    : (isKorean.value ? '체크박스 값은 제출되지 않았습니다.' : 'No checkbox value was submitted.');
}
</script>

<template>
  <form class="checkbox-example-surface checkbox-example-surface--form" @submit.prevent="submit">
    <CheckboxRoot :default-value="true" class="checkbox-control" name="notifications" value="release">
      <CheckboxIndicator class="checkbox-control__indicator">
        <Check :size="15" :stroke-width="2.5" />
      </CheckboxIndicator>
      <span>{{ isKorean ? '배포 알림 받기' : 'Receive release notifications' }}</span>
    </CheckboxRoot>

    <button class="checkbox-example-action" type="submit">
      {{ isKorean ? '양식 제출' : 'Submit form' }}
    </button>

    <output aria-live="polite">{{ result ?? (isKorean ? '제출 결과가 여기에 표시됩니다.' : 'The submitted value will appear here.') }}</output>
  </form>
</template>
