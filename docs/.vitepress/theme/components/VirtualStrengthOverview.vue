<script setup lang="ts">
import { computed } from 'vue';
import { useDocsLocale } from '../locale.js';

const { isKorean } = useDocsLocale();

const copy = computed(() => isKorean.value ? {
  aria: 'Sectile Virtual의 강점과 책임 범위',
  statementFirst: '자동 측정과 위치 보정, 네 가지 배치를',
  statementSecond: '하나의 상태 모델로 관리합니다.',
  strengths: [
    {
      title: '실제 DOM 크기를 자동 반영',
      body: '예상 높이로 첫 배치를 만듭니다. ResizeObserver가 실제 크기를 확인하면 달라진 구간부터 다시 계산합니다. 펼침, 줄바꿈, 비동기 콘텐츠로 생긴 높이 변화도 같은 흐름으로 반영합니다.',
    },
    {
      title: '삽입·삭제·이동 뒤 화면 위치 보정',
      body: '안정적인 ID를 기준으로 변경 전후 좌표를 비교하고 scrollDelta를 반환합니다. DOM 연결은 다음 화면을 그리기 전에 이 보정값을 적용합니다.',
    },
    {
      title: '목록부터 자유 좌표까지 하나의 계약',
      body: '선형 목록, 반응형 격자, 벽돌형 카드, 자유 좌표 화면이 같은 조회·측정·변경 흐름을 사용합니다.',
    },
    {
      title: '최신 측정값만 배치에 반영',
      body: '각 배치 결과에는 세대 번호가 있습니다. 늦게 도착한 이전 측정값은 거부하고 현재 화면에서 수집한 값만 다음 배치에 사용합니다.',
    },
  ],
  responsibilityTitle: 'Sectile이 맡는 계산',
  responsibilities: [
    {
      label: '입력',
      title: '앱이 넘기는 값',
      body: '안정적인 ID · 항목 순서 · 화면 영역',
    },
    {
      label: '상태',
      title: 'Sectile이 관리하는 값',
      body: '예상 크기 · 실제 측정값 · 기준 항목 · 배치 세대',
    },
    {
      label: '결과',
      title: '앱이 받는 값',
      body: '그릴 항목과 좌표 · 전체 크기 · scrollDelta',
    },
  ],
} : {
  aria: 'Sectile Virtual strengths and responsibilities',
  statementFirst: 'One state model owns automatic measurement,',
  statementSecond: 'viewport correction, and four layout strategies.',
  strengths: [
    {
      title: 'Apply real DOM size automatically',
      body: 'Sectile creates the first layout from an estimate, then recalculates the changed region from ResizeObserver measurements. Expansion, wrapping, and asynchronous content use the same path.',
    },
    {
      title: 'Correct the viewport after collection changes',
      body: 'Stable IDs relate coordinates before and after inserts, removals, and moves. Sectile returns scrollDelta, which the DOM adapter applies before the next paint.',
    },
    {
      title: 'One contract from lists to spatial layouts',
      body: 'Linear lists, responsive grids, masonry cards, and spatial surfaces share the same query, measurement, and mutation flow.',
    },
    {
      title: 'Accept only current measurements',
      body: 'Every layout plan carries a generation. Late measurements from an older plan are rejected, so only evidence collected for the current surface updates layout.',
    },
  ],
  responsibilityTitle: 'What Sectile computes',
  responsibilities: [
    {
      label: 'Input',
      title: 'Application values',
      body: 'Stable IDs · item order · viewport',
    },
    {
      label: 'State',
      title: 'Sectile-owned values',
      body: 'Estimates · measurements · anchor · generation',
    },
    {
      label: 'Output',
      title: 'Application results',
      body: 'Placements · content size · scrollDelta',
    },
  ],
});
</script>

<template>
  <section class="virtual-strength-overview" :aria-label="copy.aria">
    <p class="virtual-strength-overview__statement">
      <span>{{ copy.statementFirst }}</span>
      <span>{{ copy.statementSecond }}</span>
    </p>

    <dl class="virtual-strength-overview__strengths">
      <div v-for="strength in copy.strengths" :key="strength.title">
        <dt>{{ strength.title }}</dt>
        <dd>{{ strength.body }}</dd>
      </div>
    </dl>

    <section class="virtual-strength-overview__responsibility" :aria-label="copy.responsibilityTitle">
      <h3>{{ copy.responsibilityTitle }}</h3>
      <dl>
        <div v-for="item in copy.responsibilities" :key="item.label">
          <dt><span>{{ item.label }}</span>{{ item.title }}</dt>
          <dd>{{ item.body }}</dd>
        </div>
      </dl>
    </section>
  </section>
</template>

<style scoped>
.virtual-strength-overview {
  width: min(100%, 820px);
  margin: 24px 0 36px;
}

.virtual-strength-overview__statement {
  margin: 0 0 22px;
  color: var(--sectile-content-primary);
  font-size: 1.16rem;
  font-weight: 740;
  line-height: 1.5;
  letter-spacing: -0.015em;
}

.virtual-strength-overview__statement span { display: block; }
.virtual-strength-overview dl,
.virtual-strength-overview dl div,
.virtual-strength-overview dd { margin: 0; }

.virtual-strength-overview__strengths { display: grid; }

.virtual-strength-overview__strengths div {
  display: grid;
  grid-template-columns: minmax(150px, 0.34fr) minmax(0, 1fr);
  gap: 24px;
  padding: 16px 0;
  border-top: 1px solid var(--sectile-border-subtle);
}

.virtual-strength-overview__strengths dt {
  color: var(--sectile-content-primary);
  font-size: 0.86rem;
  font-weight: 720;
  line-height: 1.55;
}

.virtual-strength-overview__strengths dd {
  color: var(--sectile-content-secondary);
  font-size: 0.78rem;
  line-height: 1.7;
}

.virtual-strength-overview__responsibility {
  margin-top: 24px;
  overflow: hidden;
  border: 1px solid var(--sectile-border-subtle);
  border-radius: var(--sectile-radius-surface);
}

.virtual-strength-overview__responsibility h3 {
  margin: 0;
  padding: 16px 20px;
  color: var(--sectile-content-primary);
  border-bottom: 1px solid var(--sectile-border-subtle);
  font-size: 0.88rem;
  line-height: 1.45;
}

.virtual-strength-overview__responsibility dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.virtual-strength-overview__responsibility dl div {
  min-width: 0;
  padding: 18px 20px 20px;
}

.virtual-strength-overview__responsibility dl div + div {
  border-left: 1px solid var(--sectile-border-subtle);
}

.virtual-strength-overview__responsibility dt {
  display: grid;
  gap: 7px;
  color: var(--sectile-content-primary);
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.5;
}

.virtual-strength-overview__responsibility dt span {
  color: var(--sectile-action);
  font-size: 0.65rem;
  font-weight: 750;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.virtual-strength-overview__responsibility dd {
  margin-top: 7px;
  color: var(--sectile-content-secondary);
  font-size: 0.72rem;
  line-height: 1.65;
}

@media (max-width: 620px) {
  .virtual-strength-overview { margin: 20px 0 30px; }
  .virtual-strength-overview__statement { margin-bottom: 18px; font-size: 1.05rem; }
  .virtual-strength-overview__strengths div { grid-template-columns: minmax(0, 1fr); gap: 5px; padding: 14px 0; }
  .virtual-strength-overview__strengths dt { font-size: 0.84rem; }
  .virtual-strength-overview__strengths dd { font-size: 0.76rem; }
  .virtual-strength-overview__responsibility dl { grid-template-columns: minmax(0, 1fr); }
  .virtual-strength-overview__responsibility dl div + div { border-top: 1px solid var(--sectile-border-subtle); border-left: 0; }
}
</style>
