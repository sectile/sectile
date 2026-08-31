---
title: Chart
description: Vue 앱이나 브라우저 페이지에 선, 산점도, 막대, 히트맵, 파이, 도넛 차트를 추가합니다.
---

<script setup>
import ChartPackageExample from '../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# Chart

Sectile Chart는 선, 산점도, 막대, 히트맵, 파이, 도넛 차트를 그립니다. Vue 앱에서는 Vue 컴포넌트를 쓰고, 기존 HTML에는 DOM API를 연결할 수 있습니다. 직접 그리거나 브라우저 밖에서 쓸 때는 렌더링 기능을 뺀 패키지만 선택하면 됩니다.

데이터는 평범한 배열로 전달합니다. 어떤 필드가 ID와 축의 값인지 정하면 스케일, 선택, 이동, 확대·축소, 위치 찾기, Canvas 렌더링은 Sectile이 처리합니다.

## 기본 차트 체험하기

아래에서 여섯 가지 차트를 바꿔 볼 수 있습니다. 데이터 표시를 가리키거나 선택해 보고, x축과 y축이 있는 차트에서는 버튼으로 가로 범위를 옮기거나 확대해 보세요. **Code**를 열면 그대로 응용할 수 있는 Vue와 DOM 예제가 나옵니다.

<ChartPackageExample />

## 차트 선택하기

| 보여 주려는 내용 | 차트 |
| --- | --- |
| 시간이나 순서에 따른 변화 | 선 |
| 두 숫자 값의 관계 | 산점도 |
| 항목별 크기 비교 | 막대 |
| 두 기준이 만나는 지점의 값 분포 | 히트맵 |
| 전체를 이루는 몇 가지 항목의 비율 | 파이 |
| 가운데에 별도 정보를 둘 전체 비율 | 도넛 |

x축과 y축을 쓰는 선, 산점도, 막대, 히트맵에는 `ChartXAxis`와 `ChartYAxis`를 둡니다. 파이와 도넛에는 `ChartRadial`을 쓰며 이동이나 확대·축소 기능은 넣지 않습니다.

히스토그램, 누적 막대, 영역, 캔들스틱, 상자 수염, 게이지, 지도, 네트워크, 등고선, 3D 차트는 아직 전용 컴포넌트를 제공하지 않습니다. 일부는 사용자 정의 렌더러로 만들 수 있지만 기본 차트보다 구현할 일이 많습니다.

## 앱에 맞는 사용 방법 고르기

| 앱 환경 | 설치 | 시작 문서 |
| --- | --- | --- |
| Vue | `vue @sectile/chart @sectile/dom @sectile/vue` | [`ChartRoot`](./chart/vue) |
| 기존 HTML과 TypeScript | `@sectile/chart @sectile/dom` | [`createDOMChart`](./chart/dom) |
| 사용자 정의 렌더러 또는 브라우저 밖 환경 | `@sectile/chart` | [`createChartController`](./chart/projection) |

`@sectile/dom`이나 `@sectile/vue`의 차트 진입점을 가져올 때만 `@sectile/chart`가 필요합니다. 다른 DOM·Vue 기능에는 이 패키지가 추가되지 않습니다.

## 작업별 안내

| 작업 | 안내 |
| --- | --- |
| 데이터 필드와 축 연결, 데이터 갱신 | [데이터와 스케일](./chart/model) |
| 사용자 정의 렌더러, 툴팁, 위치 찾기 | [그리기와 위치 찾기](./chart/projection) |
| 선택, 키보드, 이동, 확대·축소 | [상호작용과 상태](./chart/interaction) |
| 기존 브라우저 요소 연결 | [DOM 렌더링](./chart/dom) |
| Vue 템플릿에서 차트 구성 | [Vue 차트](./chart/vue) |
| 큰 데이터의 상세도 결정 | [대규모 데이터](./chart/performance) |

## 앱에서 준비할 것

Sectile은 전달받은 데이터를 읽고 검사하지만 직접 불러오거나 표시 형식을 정하지는 않습니다. 로딩·오류 화면, 색과 배치, 숫자·날짜 형식, 주석, 선택 상태나 표시 범위의 저장은 앱에서 맡습니다.

DOM과 Vue 연동 기능은 차트 크기를 재고 Canvas에 그리며 접근성 정보를 만듭니다. 연결을 끊거나 컴포넌트를 제거하면 사용하던 브라우저 자원도 정리합니다.
