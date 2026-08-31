---
title: Chart
description: 선언형 의미, 제한된 projection, 선택적 브라우저 렌더링으로 빠른 직교·방사형 차트를 만듭니다.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart는 애플리케이션 데이터를 명시적인 좌표, 축, 레이어, 상호작용 상태와 제한된 그리기 작업으로 바꿉니다. Core는 렌더러와 무관하며, DOM과 Vue는 필수 의존성이 되지 않으면서 접근 가능한 Canvas 렌더링을 더합니다.

## 모든 기본 차트 체험하기

아래 예시는 실제 업무형 필드, 축, 선택 가능한 마크, 눈에 보이는 view control을 사용합니다. **Code**에서 선언형 Vue interface와 같은 의미의 DOM 구성을 비교할 수 있습니다.

<ChartPackageExample />

## 차트 선택하기

| 질문 | 선택 | 좌표 | 대규모 데이터 동작 |
| --- | --- | --- | --- |
| 순서 또는 시간에 따라 측정값이 어떻게 바뀌는가? | Line | 직교 | 극값을 보존하는 viewport envelope |
| 두 측정값은 어떤 관계인가? | Scatter | 직교 | 정확한 점 또는 명시적 density aggregate |
| 범주를 같은 기준선에서 어떻게 비교하는가? | Bar | 직교 | 보이는 막대를 정확히 유지하고 부족한 제한은 거부 |
| 두 차원에서 강도가 어디에 집중되는가? | Heatmap | 직교 | 정확한 cell 또는 명시적 aggregate reduction |
| 하나의 전체가 소수 항목에 어떻게 나뉘는가? | Pie | 방사형 | 정확한 slice를 유지하고 부족한 제한은 거부 |
| 중앙에 다른 정보를 둘 전체 비중이 필요한가? | Donut | 방사형 | 정확한 slice를 유지하고 부족한 제한은 거부 |

직교 차트는 `ChartXAxis`와 `ChartYAxis`를 선언합니다. Pie와 Donut은 `ChartRadial`을 선언하며 불필요한 축, pan, zoom을 만들지 않습니다.

Histogram, stacked bar, area fill, candlestick, box plot, gauge, map, network, contour, 3D scene은 기본 차트 계약이 아닙니다. 일부는 현재 primitive로 준비하거나 custom renderer로 그릴 수 있지만, Sectile은 근사 구현을 일급 차트 종류로 부르지 않습니다.

## 통합 계층 선택하기

| 필요한 범위 | 설치 | 시작 API |
| --- | --- | --- |
| 정의, 불변 상태, projection, hit testing | `@sectile/chart` | `createChartController` |
| 기존 element와 Canvas 렌더링 | `@sectile/chart @sectile/dom` | `createDOMChart` |
| 선언형 Vue 구성 | `vue @sectile/chart @sectile/dom @sectile/vue` | `ChartRoot` |

Chart는 DOM과 Vue의 optional peer입니다. `/chart` subpath를 import하지 않는 애플리케이션은 설치할 필요가 없습니다.

## 작업별 안내

| 작업 | 안내 |
| --- | --- |
| record, 축, ID, 갱신 정의 | [데이터와 스케일](./chart/model) |
| custom renderer, tooltip, hit test 작성 | [그리기와 hit testing](./chart/projection) |
| 선택, 키보드, pan, zoom 설계 | [상호작용과 상태](./chart/interaction) |
| 기존 브라우저 element 연결 | [DOM 렌더링](./chart/dom) |
| Vue template에서 차트 구성 | [Vue 구성](./chart/vue) |
| exact 또는 aggregate 전략 선택 | [대규모 데이터](./chart/performance) |

## 책임 경계

Chart는 이식 가능한 좌표, 축, ID, 검증, view domain, 선택, projection, query를 소유합니다. DOM은 브라우저 입력, 반응형 측정, 접근성 overlay, Canvas2D/WebGL2 resource와 정리를 소유합니다. Vue는 선언형 구성과 반응형 동기화를 소유합니다. 애플리케이션은 데이터 로딩, 제품 스타일, annotation, formatting 정책, 영속화를 소유합니다.
