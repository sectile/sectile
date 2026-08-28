<script setup lang="ts">
import { computed, ref } from 'vue';
import { withBase } from 'vitepress';
import { ArrowRight, Check } from '@lucide/vue';
import {
  ListboxItem,
  ListboxItemIndicator,
  ListboxItemText,
  ListboxRoot,
  type ListboxValue,
} from '@sectile/vue/listbox';
import { useDocsLocale } from '../locale.js';
import DocsButton from './DocsButton.vue';

const { isKorean } = useDocsLocale();

const environments = [
  { value: 'production', en: 'Production', ko: '프로덕션' },
  { value: 'staging', en: 'Staging', ko: '스테이징' },
  { value: 'development', en: 'Development', ko: '개발' },
  { value: 'archive', en: 'Archived preview', ko: '보관된 미리보기', disabled: true },
] as const;
const environmentIDs = environments.map(({ value }) => value);
const selected = ref<ListboxValue>('staging');
const current = ref<string | null>('staging');
const lastAction = ref('focus staging');

const copy = computed(() => isKorean.value ? {
  heroTitle: 'UI 동작은 규칙부터 설계합니다.',
  heroBody: 'Sectile은 탐색과 선택, 편집, 검증, 포커스 이동을 예측할 수 있는 상태 변화로 다룹니다. 필요한 규칙을 조합해 테스트하고, 제품에 맞게 직접 제어할 수 있습니다.',
  learnAction: '동작 방식 알아보기',
  browseAction: '컴포넌트 살펴보기',
  hostNote: 'Core에서 시작하거나 DOM, Terminal, Vue에 연결해 사용하세요.',
  statusLabel: '실시간',
  workbenchTitle: '동작이 그대로 드러납니다.',
  workbenchBody: '항목을 골라 보세요. 지금 어디에 있는지, 무엇을 선택했는지, 누가 상태를 관리하는지, 다음에 어떤 작업이 필요한지 바로 확인할 수 있습니다.',
  demoLabel: '배포 환경',
  stateTitle: '현재 동작',
  currentLabel: '현재 항목',
  selectedLabel: '선택한 값',
  ownershipLabel: '상태 관리 방식',
  actionLabel: '다음 작업',
  visibleTitle: '필요한 규칙을 숨기지 않습니다.',
  visibleBody: '컴포넌트 내부에서 암묵적으로 처리되던 결정을 애플리케이션 코드에서 확인하고 바꿀 수 있습니다.',
  visibleItems: [
    ['상태 관리', '각 값을 Sectile이 맡을지 애플리케이션이 맡을지 정합니다.'],
    ['동작 규칙', '비활성 항목을 건너뛸지, 목록 끝에서 어떻게 이동할지, 언제 실행하고 선택할지를 직접 정합니다.'],
    ['실행할 작업', '포커스 이동이나 스크롤, 안내, 데이터 요청은 실행할 순서대로 명령에 담깁니다.'],
    ['실패 처리', '입력을 처리하지 못해도 상태가 일부만 바뀌는 일은 없습니다.'],
  ],
  scopeTitle: '상호작용이 복잡해지는 순간을 다룹니다.',
  scopeBody: '작은 동작 단위로 시작해 필요한 상호작용을 차근차근 조합합니다.',
  scopes: [
    { label: '탐색과 선택', description: '리스트박스, 메뉴, 트리 뷰, 그리드, 포커스 복구', path: '/components/listbox' },
    { label: '텍스트와 폼', description: '한글 조합 입력, 검증, 제출, 상태를 직접 관리하는 필드', path: '/packages/form' },
    { label: '데이터가 많은 화면', description: '테이블, 비동기 데이터, 가상화, 뒤늦게 도착한 응답 처리', path: '/packages/tabular' },
    { label: '날짜와 시각', description: '달력 날짜, 하루 안의 시각, 선택기, 일관된 서버 렌더링', path: '/packages/temporal' },
  ],
  startTitle: '필요한 곳부터 시작하세요.',
  starts: [
    { label: '동작 모델 이해하기', description: 'Sectile이 무엇을 관리하고 상태를 어떻게 바꾸는지 알아봅니다.', path: '/guide/introduction' },
    { label: '컴포넌트 찾기', description: '바로 실행해 볼 수 있는 예제와 API 문서를 살펴봅니다.', path: '/components/' },
    { label: '패키지 설치하기', description: 'Core, DOM, Terminal, Vue 가운데 사용할 환경을 고르고 첫 예제를 실행합니다.', path: '/guide/getting-started' },
  ],
  advancedTitle: '명세까지 확인하려면',
  advancedBody: '코어 이론에서 법칙과 실패 처리, 비용 상한, 검증 근거를 확인할 수 있습니다.',
  advancedAction: '코어 이론 읽기',
} : {
  heroTitle: 'Build UI behavior from explicit rules.',
  heroBody: 'Sectile turns navigation, selection, editing, validation, and focus intent into deterministic state transitions you can compose, test, and control.',
  learnAction: 'See how Sectile works',
  browseAction: 'Browse components',
  hostNote: 'Start with Core or connect the DOM, Terminal, and Vue adapters when you need them.',
  statusLabel: 'Live',
  workbenchTitle: 'The behavior stays visible.',
  workbenchBody: 'Choose an item. Your code can inspect the current item, selected value, state owner, and next requested action.',
  demoLabel: 'Deployment environment',
  stateTitle: 'Current behavior',
  currentLabel: 'Current item',
  selectedLabel: 'Selected value',
  ownershipLabel: 'State owner',
  actionLabel: 'Next action',
  visibleTitle: 'Keep the rules your product depends on in view.',
  visibleBody: 'Decisions that normally disappear inside a widget remain available to inspect, test, and change in application code.',
  visibleItems: [
    ['State ownership', 'Choose whether Sectile or your application owns each value.'],
    ['Behavior rules', 'Set eligibility, boundary movement, activation, and selection behavior directly.'],
    ['Requested actions', 'Focus, scrolling, announcements, and data requests leave a transition as ordered commands.'],
    ['Failure handling', 'Rejected input cannot expose a partially updated state.'],
  ],
  scopeTitle: 'Built for behavior that gets complicated.',
  scopeBody: 'Start with focused primitives, then compose them into the interaction your product needs.',
  scopes: [
    { label: 'Navigation and selection', description: 'Listboxes, menus, tree views, grids, and deterministic focus recovery', path: '/components/listbox' },
    { label: 'Text and forms', description: 'IME-safe editing, validation, submission, and application-owned fields', path: '/packages/form' },
    { label: 'Data-heavy interfaces', description: 'Tables, async sources, virtualization, and stale-response handling', path: '/packages/tabular' },
    { label: 'Dates and time', description: 'Civil dates, wall-clock values, pickers, and stable server rendering', path: '/packages/temporal' },
  ],
  startTitle: 'Start where the work is.',
  starts: [
    { label: 'Understand the behavior model', description: 'See what Sectile owns and how state changes.', path: '/guide/introduction' },
    { label: 'Find a component', description: 'Open runnable examples and complete API references.', path: '/components/' },
    { label: 'Install a package', description: 'Choose Core, DOM, Terminal, or Vue and run the first example.', path: '/guide/getting-started' },
  ],
  advancedTitle: 'Need the formal specification?',
  advancedBody: 'Core theory documents the laws, failure semantics, cost bounds, and verification evidence behind the public behavior.',
  advancedAction: 'Read Core theory',
});

const environmentLabels = computed(() => Object.fromEntries(
  environments.map(({ value, en, ko }) => [value, isKorean.value ? ko : en]),
));
const selectedValue = computed(() => typeof selected.value === 'string' ? selected.value : selected.value[0] ?? 'none');
const localizedPath = (path: string): string => withBase(isKorean.value ? `/ko${path}` : path);

function selectEnvironment(next: ListboxValue): void {
  selected.value = next;
  const value = typeof next === 'string' ? next : next[0] ?? 'none';
  lastAction.value = `select ${value}`;
}

function highlightEnvironment(next: string | null): void {
  current.value = next;
  if (next !== null) lastAction.value = `focus ${next}`;
}
</script>

<template>
  <main class="docs-home">
    <section class="docs-home__hero">
      <div class="docs-home__hero-copy">
        <h1>{{ copy.heroTitle }}</h1>
        <p class="docs-home__hero-body">{{ copy.heroBody }}</p>
        <div class="docs-home__actions">
          <DocsButton
            appearance="primary"
            class="docs-home__cta"
            :href="localizedPath('/guide/introduction')"
            large
          >
            {{ copy.learnAction }}<ArrowRight :size="17" aria-hidden="true" />
          </DocsButton>
          <DocsButton class="docs-home__cta" :href="localizedPath('/components/')" large>
            {{ copy.browseAction }}
          </DocsButton>
        </div>
        <p class="docs-home__host-note">{{ copy.hostNote }}</p>
      </div>

      <section class="behavior-workbench" :aria-label="copy.workbenchTitle">
        <header class="behavior-workbench__header">
          <span>{{ copy.workbenchTitle }}</span>
          <span class="behavior-workbench__status"><i aria-hidden="true" />{{ copy.statusLabel }}</span>
        </header>
        <p>{{ copy.workbenchBody }}</p>
        <div class="behavior-workbench__body">
          <div class="behavior-workbench__demo">
            <strong>{{ copy.demoLabel }}</strong>
            <ListboxRoot
              :items="environmentIDs"
              :model-value="selected"
              :disabled-items="['archive']"
              :label="copy.demoLabel"
              class="home-listbox"
              @update:model-value="selectEnvironment"
              @highlight="highlightEnvironment"
            >
              <ListboxItem
                v-for="environment in environments"
                :key="environment.value"
                :value="environment.value"
                :disabled="'disabled' in environment && environment.disabled"
                class="home-listbox__item"
              >
                <ListboxItemText>{{ environmentLabels[environment.value] }}</ListboxItemText>
                <ListboxItemIndicator class="home-listbox__indicator">
                  <Check :size="15" aria-hidden="true" />
                </ListboxItemIndicator>
              </ListboxItem>
            </ListboxRoot>
          </div>
          <div class="behavior-workbench__state">
            <strong>{{ copy.stateTitle }}</strong>
            <dl>
              <div><dt>{{ copy.currentLabel }}</dt><dd>{{ current ?? 'none' }}</dd></div>
              <div><dt>{{ copy.selectedLabel }}</dt><dd>{{ selectedValue }}</dd></div>
              <div><dt>{{ copy.ownershipLabel }}</dt><dd>controlled</dd></div>
              <div><dt>{{ copy.actionLabel }}</dt><dd>{{ lastAction }}</dd></div>
            </dl>
          </div>
        </div>
      </section>
    </section>

    <section class="docs-home__section docs-home__explicit">
      <header class="docs-home__section-heading">
        <h2>{{ copy.visibleTitle }}</h2>
        <p>{{ copy.visibleBody }}</p>
      </header>
      <dl class="explicit-list">
        <div v-for="item in copy.visibleItems" :key="item[0]">
          <dt>{{ item[0] }}</dt>
          <dd>{{ item[1] }}</dd>
        </div>
      </dl>
    </section>

    <section class="docs-home__section docs-home__scope">
      <header class="docs-home__section-heading">
        <h2>{{ copy.scopeTitle }}</h2>
        <p>{{ copy.scopeBody }}</p>
      </header>
      <div class="scope-list">
        <a v-for="scope in copy.scopes" :key="scope.label" :href="localizedPath(scope.path)">
          <strong>{{ scope.label }}</strong>
          <span>{{ scope.description }}</span>
          <ArrowRight :size="18" aria-hidden="true" />
        </a>
      </div>
    </section>

    <section class="docs-home__section docs-home__start">
      <h2>{{ copy.startTitle }}</h2>
      <div class="start-list">
        <a v-for="start in copy.starts" :key="start.label" :href="localizedPath(start.path)">
          <span><strong>{{ start.label }}</strong><small>{{ start.description }}</small></span>
          <ArrowRight :size="20" aria-hidden="true" />
        </a>
      </div>
    </section>

    <aside class="docs-home__advanced">
      <div>
        <h2>{{ copy.advancedTitle }}</h2>
        <p>{{ copy.advancedBody }}</p>
      </div>
      <a :href="localizedPath('/theory/')">{{ copy.advancedAction }}<ArrowRight :size="17" aria-hidden="true" /></a>
    </aside>
  </main>
</template>

<style scoped>
.docs-home {
  width: 100vw;
  margin-left: calc(50% - 50vw);
  color: var(--vp-c-text-1);
}

.docs-home__hero,
.docs-home__section,
.docs-home__advanced {
  width: min(1180px, calc(100% - 48px));
  margin-inline: auto;
}

.docs-home__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.03fr) minmax(420px, 0.97fr);
  gap: clamp(48px, 7vw, 96px);
  align-items: center;
  padding: 96px 0 104px;
}

.docs-home__hero-copy h1 {
  max-width: 720px;
  margin: 0;
  font-size: clamp(3.2rem, 6.4vw, 5.6rem);
  font-weight: 760;
  letter-spacing: -0.04em;
  line-height: 0.96;
  text-wrap: balance;
}

.docs-home__hero-body {
  max-width: 670px;
  margin: 30px 0 0;
  color: var(--vp-c-text-2);
  font-size: clamp(1.08rem, 1.7vw, 1.3rem);
  line-height: 1.65;
  text-wrap: pretty;
}

.docs-home__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 34px;
}

.scope-list a:focus-visible,
.start-list a:focus-visible,
.docs-home__advanced a:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 3px;
}

.docs-home__host-note {
  margin: 18px 0 0;
  color: var(--vp-c-text-2);
  font-size: 0.86rem;
}

.behavior-workbench {
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--vp-c-brand-1) 24%, var(--vp-c-border));
  border-radius: 16px;
  background: var(--vp-c-bg-elv);
}

.behavior-workbench__header {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0 18px;
  font-size: 0.82rem;
  font-weight: 720;
}

.behavior-workbench__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--vp-c-text-2);
  font-size: 0.7rem;
  font-weight: 650;
  letter-spacing: 0.02em;
}

.behavior-workbench__status i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sectile-feedback-success);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--sectile-feedback-success) 50%, transparent);
}

.behavior-workbench > p {
  margin: 0;
  padding: 18px 18px 0;
  color: var(--vp-c-text-2);
  font-size: 0.87rem;
  line-height: 1.55;
}

.behavior-workbench__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(190px, 0.86fr);
  gap: 18px;
  padding: 18px;
}

.behavior-workbench__demo > strong,
.behavior-workbench__state > strong {
  display: block;
  margin-bottom: 9px;
  color: var(--vp-c-text-2);
  font-size: 0.69rem;
  font-weight: 760;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.home-listbox {
  display: grid;
  gap: 5px;
}

.home-listbox__item {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  padding: 0 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  font-size: 0.82rem;
  font-weight: 620;
  cursor: pointer;
}

.home-listbox__item:hover,
.home-listbox__item[data-highlighted] {
  border-color: var(--vp-c-border);
  color: var(--vp-c-text-1);
  background: var(--sectile-surface-hover);
}

.home-listbox__item[data-selected] {
  border-color: color-mix(in srgb, var(--vp-c-brand-1) 52%, var(--vp-c-divider));
  color: var(--vp-c-text-1);
  background: var(--vp-c-brand-soft);
}

.home-listbox__item[data-disabled] {
  color: var(--vp-c-text-3);
  cursor: not-allowed;
  opacity: 0.58;
}

.home-listbox__item:focus-visible {
  outline: 2px solid var(--sectile-focus-ring);
  outline-offset: 2px;
}

.home-listbox__indicator {
  color: var(--vp-c-brand-1);
}

.home-listbox__indicator:not([hidden]) {
  display: inline-flex;
}

.home-listbox__indicator[hidden] {
  display: none;
}

.behavior-workbench__state {
  border-radius: 11px;
  padding: 13px;
  background: color-mix(in srgb, var(--vp-c-bg-soft) 84%, var(--vp-c-brand-1));
}

.behavior-workbench__state dl {
  margin: 0;
}

.behavior-workbench__state dl > div {
  display: grid;
  gap: 4px;
  border-top: 1px solid var(--vp-c-divider);
  padding: 9px 0;
}

.behavior-workbench__state dl > div:first-child {
  border-top: 0;
  padding-top: 0;
}

.behavior-workbench__state dt {
  color: var(--vp-c-text-2);
  font-size: 0.67rem;
}

.behavior-workbench__state dd {
  min-width: 0;
  margin: 0;
  overflow-wrap: anywhere;
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 0.74rem;
  font-weight: 650;
}

.docs-home__section {
  padding: 104px 0;
}

.docs-home__explicit {
  border-top: 1px solid var(--vp-c-divider);
}

.docs-home__section-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.72fr);
  gap: clamp(48px, 10vw, 140px);
  align-items: end;
}

.docs-home__section h2,
.docs-home__advanced h2 {
  margin: 0;
  font-size: clamp(2.2rem, 4.2vw, 3.65rem);
  letter-spacing: -0.035em;
  line-height: 1.05;
  text-wrap: balance;
}

.docs-home__section-heading > p {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 1rem;
  line-height: 1.7;
}

.explicit-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 64px 0 0;
  border-top: 1px solid var(--vp-c-border);
}

.explicit-list > div {
  display: grid;
  grid-template-columns: minmax(120px, 0.38fr) minmax(0, 1fr);
  gap: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 25px 0;
}

.explicit-list > div:nth-child(odd) {
  padding-right: 30px;
}

.explicit-list > div:nth-child(even) {
  border-left: 1px solid var(--vp-c-divider);
  padding-left: 30px;
}

.explicit-list dt {
  font-size: 0.9rem;
  font-weight: 730;
}

.explicit-list dd {
  margin: 0;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.65;
}

.docs-home__scope {
  width: 100%;
  padding-inline: max(24px, calc((100% - 1180px) / 2));
  background: var(--vp-c-bg-alt);
}

.scope-list {
  display: grid;
  margin-top: 64px;
  border-top: 1px solid var(--vp-c-border);
}

.scope-list a {
  display: grid;
  grid-template-columns: minmax(210px, 0.42fr) minmax(0, 1fr) auto;
  gap: 32px;
  align-items: center;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 24px 2px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 160ms ease-out, transform 160ms ease-out;
}

.scope-list a:hover {
  color: var(--vp-c-brand-1);
  transform: translateX(8px);
}

.scope-list strong {
  font-size: 1rem;
}

.scope-list span {
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
}

.docs-home__start {
  display: grid;
  grid-template-columns: minmax(260px, 0.58fr) minmax(0, 1fr);
  gap: clamp(48px, 10vw, 140px);
}

.start-list {
  border-top: 1px solid var(--vp-c-border);
}

.start-list a {
  display: flex;
  min-height: 112px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 22px 2px;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 160ms ease-out, transform 160ms ease-out;
}

.start-list a:hover {
  color: var(--vp-c-brand-1);
  transform: translateX(8px);
}

.start-list span {
  display: grid;
  gap: 7px;
}

.start-list strong {
  font-size: 1.05rem;
}

.start-list small {
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.55;
}

.docs-home__advanced {
  display: flex;
  min-height: 176px;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  margin-bottom: 104px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 36px 42px;
  background: var(--vp-c-bg-soft);
}

.docs-home__advanced h2 {
  font-size: clamp(1.65rem, 3vw, 2.35rem);
}

.docs-home__advanced p {
  max-width: 680px;
  margin: 12px 0 0;
  color: var(--vp-c-text-2);
  line-height: 1.65;
}

.docs-home__advanced a {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  color: var(--vp-c-brand-1);
  font-size: 0.92rem;
  font-weight: 720;
  text-decoration: none;
}

@media (max-width: 940px) {
  .docs-home__hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 60px;
    padding-top: 76px;
  }

  .docs-home__hero-copy {
    max-width: 760px;
  }

  .behavior-workbench {
    max-width: 720px;
  }

  .docs-home__section-heading,
  .docs-home__start {
    grid-template-columns: minmax(0, 1fr);
    gap: 34px;
  }
}

@media (max-width: 680px) {
  .docs-home__hero,
  .docs-home__section,
  .docs-home__advanced {
    width: min(100% - 40px, 1180px);
  }

  .docs-home__hero {
    gap: 46px;
    padding: 58px 0 72px;
  }

  .docs-home__hero-copy h1 {
    font-size: clamp(2.7rem, 13vw, 4rem);
  }

  .docs-home__hero-body {
    margin-top: 24px;
    font-size: 1rem;
  }

  .docs-home__actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
  }

  .docs-home__cta {
    width: 100%;
  }

  .behavior-workbench__body {
    grid-template-columns: minmax(0, 1fr);
  }

  .docs-home__section {
    padding: 76px 0;
  }

  .docs-home__scope {
    width: 100%;
    padding-inline: 20px;
  }

  .explicit-list {
    grid-template-columns: minmax(0, 1fr);
    margin-top: 44px;
  }

  .explicit-list > div {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
    padding: 20px 0 !important;
    border-left: 0 !important;
  }

  .scope-list {
    margin-top: 44px;
  }

  .scope-list a {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 20px;
  }

  .scope-list span {
    grid-column: 1;
  }

  .scope-list svg {
    grid-row: 1 / span 2;
    grid-column: 2;
  }

  .start-list a {
    min-height: 104px;
  }

  .docs-home__advanced {
    align-items: flex-start;
    flex-direction: column;
    gap: 24px;
    margin-bottom: 72px;
    padding: 28px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .scope-list a,
  .start-list a {
    transition: none;
  }
}
</style>
