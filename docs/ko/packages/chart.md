---
title: Chart
description: 화면 표현과 분리된 상태 모델과 Canvas 렌더링으로 빠르고 접근 가능한 차트를 만듭니다.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart는 특정 디자인을 강제하지 않으면서 차트의 데이터, 상호작용, 브라우저 동작을 제공합니다. 기본 Canvas 렌더러로 데이터 마크를 그리고, 제품에 필요한 축, 레이블, 범례, 색상과 레이아웃을 더할 수 있습니다.

## 차트 종류 살펴보기

다섯 가지 데이터 프로필을 바꿔 가며 확인해 보세요. 마크를 가리키거나 선택하면 애플리케이션이 받는 차트 상태도 함께 바뀝니다. **코드** 탭에는 바로 사용할 수 있는 Vue 예제가 있습니다.

<ChartPackageExample />

## 차트 종류 선택하기

| 표현하려는 데이터 | 프로필 | 대표적인 차트 |
| --- | --- | --- |
| 개별 `x`, `y` 관측값 | `point` | 산점도, 버블 차트, 점 도표 |
| 순서가 있는 `x`, `y` 값 | `ordered-series` | 선 차트, 영역 경계, 스파크라인 |
| 직사각형 구간 | `cartesian-segment` | 막대, 세로 막대, 범위 막대, 워터폴 |
| 행과 열의 위치 | `grid-cell` | 히트맵, 행렬 |
| 전체에서 차지하는 비중 | `radial-segment` | 파이, 도넛, 방사형 비율 차트 |

한 화면에 여러 형태가 필요하면 레이어를 조합하면 됩니다. 히스토그램, 누적 차트, 캔들스틱, 상자 수염 그림, 게이지도 하나 이상의 프로필로 데이터를 준비해 만들 수 있습니다. 네트워크 그래프, 지도, 등고선, 3D 장면, 크기가 제한되지 않은 스트리밍 데이터는 현재 지원 범위가 아닙니다.

## 연결 방식 선택하기

- Vue에서는 [Vue 구성](./chart/vue)의 `ChartRoot`, `ChartCanvas`, 반응형 모델과 `v-model` 상태를 사용합니다.
- 기존 요소와 canvas를 직접 연결하려면 [DOM 렌더링](./chart/dom)을 사용합니다.
- 브라우저 렌더링 없이 차트 상태, 투영, 쿼리만 필요하면 `@sectile/chart`를 단독으로 사용합니다.

```sh
pnpm add @sectile/chart
```

`@sectile/chart`는 DOM과 Vue 패키지의 선택적 peer입니다. Chart 진입점을 사용하는 애플리케이션에만 설치하면 됩니다.

## 작업별 안내

| 하려는 작업 | 문서 |
| --- | --- |
| 입력 데이터 구성, ID 선택, 값 갱신 | [데이터와 스케일](./chart/model) |
| 툴팁, hit testing, 사용자 정의 렌더러 구현 | [그리기와 hit testing](./chart/projection) |
| hover, 선택, 키보드 focus, 이동과 확대 제어 | [상호작용과 상태](./chart/interaction) |
| 기존 canvas 연결 | [DOM 렌더링](./chart/dom) |
| Vue 템플릿에서 차트 구성 | [Vue 구성](./chart/vue) |
| 대규모 차트 조정 | [대규모 데이터](./chart/performance) |

## Chart가 담당하는 범위

Chart는 안정적인 데이터 ID, 입력 검증, 선택, 키보드 cursor, 이동, 확대, hit testing과 제한된 그리기 작업을 담당합니다. 데이터 로딩, 시각 디자인, 축, 레이블, 범례, 주석, 레이아웃과 애니메이션은 애플리케이션이 담당합니다.
