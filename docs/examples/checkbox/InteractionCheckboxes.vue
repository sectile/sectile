<script setup lang="ts">
import { Check } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

const { isKorean } = useDocsLocale();
</script>

<template>
  <div class="checkbox-example-surface checkbox-example-surface--states">
    <div class="checkbox-example-state">
      <CheckboxRoot :default-value="true" class="checkbox-control" disabled>
        <CheckboxIndicator class="checkbox-control__indicator">
          <Check :size="15" :stroke-width="2.5" />
        </CheckboxIndicator>
        <span>{{ isKorean ? '조직 정책 적용' : 'Organization policy' }}</span>
      </CheckboxRoot>
      <small>{{ isKorean ? '비활성 상태는 포커스와 입력을 받지 않습니다.' : 'Disabled controls receive neither focus nor input.' }}</small>
    </div>

    <div class="checkbox-example-state">
      <CheckboxRoot :default-value="true" class="checkbox-control" readonly>
        <CheckboxIndicator class="checkbox-control__indicator">
          <Check :size="15" :stroke-width="2.5" />
        </CheckboxIndicator>
        <span>{{ isKorean ? '감사 기록 보존' : 'Retain audit log' }}</span>
      </CheckboxRoot>
      <small>{{ isKorean ? '읽기 전용 상태는 포커스할 수 있지만 값은 바뀌지 않습니다.' : 'Readonly controls remain focusable without changing value.' }}</small>
    </div>
  </div>
</template>
