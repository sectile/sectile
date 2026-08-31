<script setup lang="ts">
import { computed } from 'vue';
import { withBase } from 'vitepress';
import { ArrowRight } from '@lucide/vue';
import { useDocsLocale } from '../locale.js';
import DocsButton from './DocsButton.vue';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  heroTitle: '일관된 동작을 위한 공통 상태 모델',
  heroBody: 'Sectile은 현재 상태와 입력으로 다음 상태와 실행할 작업을 계산합니다. 탐색·선택·편집·검증·날짜·표·가상화에 필요한 동작을 조합하며, 결과와 실패 조건, 비용 상한을 하나의 계약으로 다룹니다.',
  learnAction: '패키지 살펴보기',
  browseAction: '핵심 개념 읽기',
  visibleTitle: '결과·실패·비용을 아우르는 동작 계약',
  visibleBody: '각 계약에는 정상 결과, 실패 조건, 계산 비용이 함께 들어갑니다. 구현이 달라져도 같은 입력 과정이 같은 결과를 내는지 검증할 수 있습니다.',
  visibleItems: [
    ['상태', '현재 위치, 선택, 펼침, 텍스트, 검증 상태처럼 동작에 필요한 사실을 값으로 표현합니다.'],
    ['연산', '의미 있는 입력을 받아 새 상태와 순서 있는 작업을 함께 계산합니다.'],
    ['실패', '처리할 수 없는 입력은 형식이 있는 오류가 되며 기존 상태는 그대로 유지됩니다.'],
    ['비용', '시간, 공간, 할당, 보유 자원의 상한을 공개 계약과 검증 근거에 포함합니다.'],
  ],
  scopeTitle: '문제 영역별 상태 모델',
  scopeBody: '각 패키지는 하나의 문제 영역을 맡고, 공개된 값과 연산으로 서로 연결됩니다.',
  scopes: [
    { label: 'Core', description: '순서·범위·격자·계층 구조와 상태 전이, 명령, 실패', path: '/packages/core' },
    { label: 'Form', description: '필드 경로, 값, 검증, 오류, 제출, 초기화', path: '/packages/form' },
    { label: 'Temporal', description: '달력 날짜, 하루 안의 시각, 범위, 달력 연산', path: '/packages/temporal' },
    { label: 'Tabular · Virtual · Chart', description: '표 형식 데이터, 화면 영역 배치, 측정, 차트 모델과 질의', path: '/packages/' },
  ],
  startTitle: '목적별 문서 안내',
  starts: [
    { label: '패키지 지도', description: '문제 영역과 패키지별 책임, 공개 경계를 확인합니다.', path: '/packages/' },
    { label: '코어 이론', description: '상태, 전이, 조합, 실패 원칙을 설명합니다.', path: '/theory/' },
    { label: '시작하기', description: '필요한 패키지를 설치하고 첫 공개 API를 사용합니다.', path: '/guide/getting-started' },
  ],
  advancedTitle: '동작 계약에 포함된 성능 기준',
  advancedBody: '각 모델은 시간·공간·자원 사용의 한도를 동작과 함께 정의합니다. 코어 이론에서 이 기준이 적용되는 범위를 확인할 수 있습니다.',
  advancedAction: '보장 범위 보기',
} : {
  heroTitle: 'A shared state model for consistent behavior',
  heroBody: 'Sectile derives the next state and ordered work from the current state and input. Navigation, selection, editing, validation, dates, tables, and virtualization compose through contracts that define results, failures, and cost bounds together.',
  learnAction: 'Browse packages',
  browseAction: 'Read the core concepts',
  visibleTitle: 'Behavior contracts for results, failures, and cost',
  visibleBody: 'A public contract covers successful results, failure behavior, and computational cost. The same input trace remains verifiable as implementations change.',
  visibleItems: [
    ['State', 'Represent position, selection, expansion, text, and validation facts as values.'],
    ['Operations', 'Accept semantic input and calculate a new state with ordered work.'],
    ['Failures', 'Return typed errors for rejected input while preserving the previous state.'],
    ['Cost', 'Include time, space, allocation, and retained-resource bounds in the public contract and evidence.'],
  ],
  scopeTitle: 'State models by problem domain',
  scopeBody: 'Each package owns one problem domain and connects through public values and operations.',
  scopes: [
    { label: 'Core', description: 'Sequence, range, grid, and tree structures with transitions, commands, and failures', path: '/packages/core' },
    { label: 'Form', description: 'Field paths, values, validation, errors, submission, and reset', path: '/packages/form' },
    { label: 'Temporal', description: 'Civil dates, wall-clock time, ranges, and calendar operations', path: '/packages/temporal' },
    { label: 'Tabular · Virtual · Chart', description: 'Tabular data, viewport layout, measurement, chart models, and queries', path: '/packages/' },
  ],
  startTitle: 'Documentation by purpose',
  starts: [
    { label: 'Package map', description: 'See domain ownership, package responsibilities, and public boundaries.', path: '/packages/' },
    { label: 'Core theory', description: 'Read about state, transitions, composition, and failure principles.', path: '/theory/' },
    { label: 'Getting started', description: 'Install the package you need and call its first public API.', path: '/guide/getting-started' },
  ],
  advancedTitle: 'Performance bounds in behavior contracts',
  advancedBody: 'Each model defines its time, space, and resource limits alongside its behavior. Core theory explains where these guarantees apply.',
  advancedAction: 'Read scope and guarantees',
});

const localizedPath = (path: string): string => withBase(isKorean.value ? `/ko${path}` : path);
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
            :href="localizedPath('/packages/')"
            large
          >
            {{ copy.learnAction }}<ArrowRight :size="17" aria-hidden="true" />
          </DocsButton>
          <DocsButton class="docs-home__cta" :href="localizedPath('/theory/')" large>
            {{ copy.browseAction }}
          </DocsButton>
        </div>
      </div>
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
      <a :href="localizedPath('/theory/scope')">{{ copy.advancedAction }}<ArrowRight :size="17" aria-hidden="true" /></a>
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
  padding: 96px 0 104px;
}

.docs-home__hero-copy {
  max-width: 900px;
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
    padding-top: 76px;
  }

  .docs-home__hero-copy {
    max-width: 760px;
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
