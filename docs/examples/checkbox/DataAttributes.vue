<script setup lang="ts">
import { Check, Minus } from '@lucide/vue';
import { CheckboxIndicator, CheckboxRoot, type CheckboxValue } from '@sectile/vue/checkbox';
import { computed, ref } from 'vue';
import { useDocsLocale } from '../../.vitepress/theme/locale.js';

type Part = 'root' | 'indicator';

const value = ref<CheckboxValue>(false);
const disabled = ref(false);
const readonly = ref(false);
const selectedPart = ref<Part>('root');
const { isKorean } = useDocsLocale();

const dataState = computed(() => value.value === true
  ? 'checked'
  : value.value === false ? 'unchecked' : 'indeterminate');
const partLabel = computed(() => selectedPart.value === 'root' ? 'CheckboxRoot' : 'CheckboxIndicator');
const attributes = computed(() => {
  const shared = [
    ['data-scope', 'checkbox'],
    ['data-part', selectedPart.value],
    ['data-state', dataState.value],
  ];
  if (selectedPart.value === 'root' && disabled.value) shared.push(['data-disabled', '']);
  if (selectedPart.value === 'root' && readonly.value) shared.push(['data-readonly', '']);
  return shared;
});
</script>

<template>
  <section class="checkbox-attributes-lab" :aria-label="isKorean ? '체크박스 구조 살펴보기' : 'Explore checkbox structure'">
    <header class="checkbox-attributes-lab__controls">
      <div class="checkbox-attributes-lab__control-group">
        <span>{{ isKorean ? '상태' : 'State' }}</span>
        <div class="checkbox-attributes-lab__segmented" role="group" :aria-label="isKorean ? '체크박스 상태' : 'Checkbox state'">
          <button type="button" :aria-pressed="value === false" @click="value = false">
            {{ isKorean ? '해제' : 'Unchecked' }}
          </button>
          <button type="button" :aria-pressed="value === true" @click="value = true">
            {{ isKorean ? '선택' : 'Checked' }}
          </button>
          <button type="button" :aria-pressed="value === 'indeterminate'" @click="value = 'indeterminate'">
            {{ isKorean ? '일부 선택' : 'Indeterminate' }}
          </button>
        </div>
      </div>

      <div class="checkbox-attributes-lab__flags" :aria-label="isKorean ? '상호작용 상태' : 'Interaction state'">
        <button type="button" :aria-pressed="disabled" @click="disabled = !disabled">
          disabled
        </button>
        <button type="button" :aria-pressed="readonly" @click="readonly = !readonly">
          readonly
        </button>
      </div>
    </header>

    <div class="checkbox-attributes-lab__body">
      <div class="checkbox-attributes-lab__diagram">
        <p>
          {{ isKorean
            ? '라벨을 선택하면 실제 화면에서 각 구성 요소가 차지하는 영역과 속성을 확인할 수 있습니다.'
            : 'Select a label to see the area and attributes owned by each part.' }}
        </p>

        <div class="checkbox-attributes-lab__canvas" :data-selected-part="selectedPart">
          <button
            class="checkbox-attributes-lab__part-label checkbox-attributes-lab__part-label--root"
            type="button"
            :aria-pressed="selectedPart === 'root'"
            @click="selectedPart = 'root'"
          >
            <strong>Root</strong>
            <span>{{ isKorean ? '전체 클릭·포커스 영역' : 'Entire click and focus area' }}</span>
          </button>

          <CheckboxRoot
            v-model="value"
            class="checkbox-attributes-lab__checkbox"
            :disabled="disabled"
            :readonly="readonly"
            name="structure-demo"
          >
            <CheckboxIndicator class="checkbox-attributes-lab__indicator" v-slot="{ isIndeterminate }">
              <Minus v-if="isIndeterminate" :size="18" :stroke-width="2.5" />
              <Check v-else :size="18" :stroke-width="2.5" />
            </CheckboxIndicator>
            <span>
              <strong>{{ isKorean ? '배포 알림 받기' : 'Receive release notifications' }}</strong>
              <small>{{ isKorean ? '클릭하면 체크 상태가 바뀝니다.' : 'Click to change the checked state.' }}</small>
            </span>
          </CheckboxRoot>

          <button
            class="checkbox-attributes-lab__part-label checkbox-attributes-lab__part-label--indicator"
            type="button"
            :aria-pressed="selectedPart === 'indicator'"
            @click="selectedPart = 'indicator'"
          >
            <strong>Indicator</strong>
            <span>{{ isKorean ? '상태 기호 영역' : 'State mark area' }}</span>
          </button>
        </div>

      </div>

      <div class="checkbox-attributes-lab__inspector" aria-live="polite">
        <div>
          <span>{{ isKorean ? '선택한 구성 요소' : 'Selected part' }}</span>
          <strong>{{ partLabel }}</strong>
        </div>
        <dl>
          <template v-for="([name, attributeValue]) in attributes" :key="name">
            <dt>{{ name }}</dt>
            <dd>{{ attributeValue === '' ? (isKorean ? '있음' : 'present') : attributeValue }}</dd>
          </template>
        </dl>
      </div>
    </div>
  </section>
</template>
