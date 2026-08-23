<script setup lang="ts">
import { Check } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { computed, ref } from 'vue';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

const checked = ref(true);
const { isKorean } = useDocsLocale();
const status = computed(() => checked.value
  ? (isKorean.value ? '부모 상태에 포함되어 있습니다.' : 'Included in the parent state.')
  : (isKorean.value ? '부모 상태에서 제외되어 있습니다.' : 'Excluded from the parent state.'));
</script>

<template>
  <div class="checkbox-example-surface checkbox-example-surface--ownership">
    <CheckboxRoot v-model="checked" class="checkbox-control" name="release-approval">
      <CheckboxIndicator class="checkbox-control__indicator">
        <Check :size="15" :stroke-width="2.5" />
      </CheckboxIndicator>
      <span>{{ isKorean ? '배포 승인' : 'Approve release' }}</span>
    </CheckboxRoot>

    <button class="checkbox-example-action" type="button" @click="checked = !checked">
      {{ isKorean ? '부모에서 값 변경' : 'Change from parent' }}
    </button>

    <p aria-live="polite">{{ status }}</p>
  </div>
</template>
