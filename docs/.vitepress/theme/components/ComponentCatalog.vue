<script setup lang="ts">
import { computed, ref } from 'vue';
import catalog from '../../../data/components.json' with { type: 'json' };
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const query = ref('');
const title = (value: string): string => value
  .split('-')
  .map((part) => part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`)
  .join(' ');

const components = computed(() => {
  const search = query.value.trim().toLowerCase();
  return catalog.components.filter((component) => {
    if (search.length === 0) return true;
    return [component.id, component.family, ...component.capabilities]
      .some((value) => value.includes(search));
  });
});

const koNames: Record<string, string> = {
  accordion: '아코디언', 'alert-dialog': '확인 대화상자', calendar: '달력', carousel: '회전 목록',
  'cascade-select': '단계별 선택', checkbox: '체크박스', 'checkbox-group': '체크박스 묶음',
  'color-picker': '색상 선택기', combobox: '콤보박스', 'date-field': '날짜 입력', 'date-picker': '날짜 선택기',
  'date-range-field': '날짜 범위 입력', 'date-range-picker': '날짜 범위 선택기', 'date-time-field': '날짜·시간 입력',
  'date-time-picker': '날짜·시간 선택기', 'date-time-range-picker': '날짜·시간 범위 선택기', dialog: '대화상자',
  disclosure: '상세 내용 펼치기', editable: '인라인 편집', feed: '피드', grid: '격자', listbox: '목록 상자',
  menu: '메뉴', 'menu-button': '메뉴 버튼', menubar: '메뉴 막대', 'multi-thumb-slider': '다중 슬라이더',
  'navigation-menu': '이동 메뉴', 'number-field': '숫자 입력', pagination: '페이지 나누기', 'pin-input': '인증 번호 입력',
  popover: '팝오버', 'quantity-field': '수량 입력', 'radio-group': '라디오 버튼 묶음', rating: '평점', select: '선택 상자',
  slider: '슬라이더', 'spin-button': '증감 입력', stepper: '단계 진행', switch: '스위치', tabs: '탭',
  'tags-input': '태그 입력', text: '텍스트 입력', 'time-field': '시간 입력', 'time-range-field': '시간 범위 입력',
  timer: '타이머', toast: '토스트 알림', 'toggle-button': '토글 버튼', 'toggle-group': '토글 버튼 묶음',
  toolbar: '도구 막대', tooltip: '도움말', 'tree-grid': '계층 격자', 'tree-view': '계층 보기', 'window-splitter': '영역 크기 조절',
};

const koFamilies: Record<string, string> = {
  checked: '선택 상태', editing: '입력과 편집', 'linear-choice': '목록 선택', range: '범위와 수치',
  'date-time': '날짜와 시간', collection: '모음과 탐색', menu: '메뉴', popup: '떠 있는 영역',
  expansion: '펼침과 접힘', navigation: '이동', 'paged-navigation': '페이지 이동', 'linear-action': '작업 모음',
  'tree-choice': '계층 선택', feedback: '알림과 피드백',
};

const componentName = (id: string) => isKorean.value ? (koNames[id] ?? title(id)) : title(id);
const familyName = (family: string) => isKorean.value ? (koFamilies[family] ?? title(family)) : title(family);
</script>

<template>
  <div class="component-catalog">
    <input
      v-model="query"
      class="component-catalog__search"
      type="search"
      :placeholder="isKorean ? '이름이나 기능으로 찾기' : 'Filter by component, family, or capability'"
      :aria-label="isKorean ? '컴포넌트 찾기' : 'Filter components'"
    >
    <div class="component-catalog__grid">
      <a
        v-for="component in components"
        :key="component.id"
        class="component-catalog__link"
        :href="`./${component.id}`"
      >
        <strong>{{ componentName(component.id) }}</strong>
        <span class="component-catalog__family">{{ familyName(component.family) }}</span>
      </a>
    </div>
  </div>
</template>
