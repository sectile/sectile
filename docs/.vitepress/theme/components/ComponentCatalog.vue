<script setup lang="ts">
import { TextField } from '@sectile/vue/text';
import { computed, ref } from 'vue';
import catalog from '../../../data/components.json' with { type: 'json' };
import { componentSections } from '../../../data/component-sections.js';
import { useDocsLocale } from '../locale.js';
import ComponentGalleryCard from './ComponentGalleryCard.vue';

const { isKorean } = useDocsLocale();
const query = ref('');

const title = (value: string): string => value
  .split('-')
  .map((part) => part.length === 0 ? part : `${part[0]?.toUpperCase()}${part.slice(1)}`)
  .join(' ');

const koFamilies: Record<string, string> = {
  checked: '선택 상태', editing: '입력과 편집', 'linear-choice': '목록 선택', range: '범위와 수치',
  'date-time': '날짜와 시간', collection: '모음과 탐색', menu: '메뉴', popup: '떠 있는 영역',
  expansion: '펼침과 접힘', navigation: '이동', 'paged-navigation': '페이지 이동', 'linear-action': '작업 모음',
  'tree-choice': '계층 선택', feedback: '알림과 피드백',
};

const familyName = (family: string) => isKorean.value ? (koFamilies[family] ?? title(family)) : title(family);
const componentsById = new Map(catalog.components.map((component) => [component.id, component]));

const sections = computed(() => {
  const search = query.value.trim().toLowerCase();

  return componentSections
    .map((section) => ({
      ...section,
      title: isKorean.value ? section.koText : section.text,
      components: section.componentIds
        .map((id) => componentsById.get(id))
        .filter((component): component is NonNullable<typeof component> => component !== undefined)
        .filter((component) => search.length === 0 || [
          component.id,
          title(component.id).toLowerCase(),
          component.family,
          familyName(component.family).toLowerCase(),
          ...component.capabilities,
        ].some((value) => value.includes(search))),
    }))
    .filter((section) => section.components.length > 0);
});
</script>

<template>
  <div class="component-catalog">
    <TextField
      v-model="query"
      class="component-catalog__search"
      type="search"
      :placeholder="isKorean ? '이름이나 기능으로 찾기' : 'Filter by component, family, or capability'"
      :aria-label="isKorean ? '컴포넌트 찾기' : 'Filter components'"
    />

    <section
      v-for="section in sections"
      :key="section.text"
      class="component-catalog__section"
      :aria-labelledby="`component-section-${section.text.toLowerCase().replaceAll(' ', '-')}`"
    >
      <header class="component-catalog__section-header">
        <h2 :id="`component-section-${section.text.toLowerCase().replaceAll(' ', '-')}`">
          {{ section.title }}
        </h2>
        <span>{{ section.components.length }}</span>
      </header>
      <ul class="component-catalog__grid">
        <ComponentGalleryCard
          v-for="component in section.components"
          :key="component.id"
          :component="component.id"
          :family-label="familyName(component.family)"
          :href="`./${component.id}`"
          :scenario="component.scenarios.dom[0] ?? ''"
          :title="title(component.id)"
        />
      </ul>
    </section>

    <p v-if="sections.length === 0" class="component-catalog__empty">
      {{ isKorean ? '일치하는 컴포넌트가 없습니다.' : 'No matching components.' }}
    </p>
  </div>
</template>

<style scoped>
.component-catalog__search {
  width: 100%;
  margin: 10px 0 34px;
  padding: 12px 14px;
  border: 1px solid var(--vp-c-border);
  border-radius: 10px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font: inherit;
}

.component-catalog__section + .component-catalog__section {
  margin-top: 42px;
}

.component-catalog__section-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.component-catalog__section-header h2 {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 20px;
  line-height: 1.4;
}

.component-catalog__section-header span {
  color: var(--vp-c-text-3);
  font-size: 12px;
}

.component-catalog__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.component-catalog__empty {
  padding: 30px 0;
  color: var(--vp-c-text-3);
  text-align: center;
}

</style>
