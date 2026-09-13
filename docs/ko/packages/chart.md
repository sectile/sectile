---
title: Chart
description: 선, 산점도, 막대, 히트맵, 파이, 도넛 차트에서 데이터·스케일·상호작용 상태를 같은 규칙으로 다룹니다.
---

# Chart

Sectile Chart는 차트 데이터, 스케일, 현재 보이는 범위, 선택, 상호작용 상태를 화면 환경과 분리합니다. Vue와 DOM 연결은 브라우저의 크기 측정, 접근 가능한 상호작용, Canvas 렌더링을 맡습니다. `@sectile/chart`를 직접 사용하면 애플리케이션이 자체 렌더러를 만들거나 다른 형식으로 그래픽을 내보낼 수도 있습니다.

애플리케이션 데이터는 평범한 배열로 유지합니다. 각 항목의 ID를 안정적으로 유지하면 데이터가 갱신된 뒤에도 선택과 현재 가리키는 항목을 이어 갈 수 있습니다. 차트 정의에는 어느 필드를 축이나 방사형 레이어에 사용할지 적습니다.

## 데이터에서 확인할 내용에 맞춰 차트 고르기

대표 예제로 12주 매출을 보여 주는 선 차트부터 살펴봅니다. 점을 가리키거나 선택하면 해당 주의 값을 확인할 수 있고, 더 자세히 볼 필요가 있을 때만 표시 범위를 좁히거나 옮깁니다. 다른 차트 종류는 이 미리보기 안에서 데이터를 바꾸는 대신, 각 작업 가이드에서 독립된 예제로 보여 줍니다.

**사용 코드**는 페이지 상단의 **연결 방식**을 따릅니다. 미리보기에는 문서용 제목, 요약, 세부 값 표시가 더해져 있고, 사용 코드는 같은 차트 데이터를 공개 Vue 또는 DOM 연결에 붙이는 흐름에 집중합니다.

| 데이터에서 확인하려는 내용 | 차트 |
| --- | --- |
| 시간이나 다른 순서가 있는 기준에 따라 값이 어떻게 바뀌는가? | 선 |
| 두 수치가 어떤 관계를 보이는가? | 산점도 |
| 여러 범주의 값을 같은 기준선에서 어떻게 비교하는가? | 막대 |
| 두 차원에서 값이 어느 구간에 집중되는가? | 히트맵 |
| 하나의 전체가 몇 개 항목에 어떤 비율로 나뉘는가? | 파이 |
| 전체 비율을 보여주면서 가운데 공간도 남겨야 하는가? | 도넛 |

선, 산점도, 막대, 히트맵은 직교 좌표 축을 사용합니다. 파이와 도넛은 방사형 좌표를 사용하며 축 이동이나 확대·축소 기능을 제공하지 않습니다.

## 애플리케이션 데이터를 축에 연결하기

차트 정의에는 데이터 항목의 ID와 실제로 그릴 값이 들어 있는 필드를 지정합니다. 다음 예제는 화면 환경별 자원을 만들지 않고 주간 매출 데이터를 날짜 축과 금액 축에 연결합니다.

```ts
import type { ChartDefinition } from '@sectile/chart/definition'

const revenue = [
  { id: 'week-27', date: new Date('2026-07-06'), amount: 128_000 },
  { id: 'week-28', date: new Date('2026-07-13'), amount: 142_000 },
  { id: 'week-29', date: new Date('2026-07-20'), amount: 137_000 },
]

const definition = {
  coordinate: {
    kind: 'cartesian',
    axes: [
      { id: 'date', orientation: 'x', scale: 'temporal', field: 'date', label: 'Week' },
      { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount', label: 'Revenue' },
    ],
  },
  layers: [{
    kind: 'line',
    id: 'weekly-revenue',
    data: revenue,
    xAxis: 'date',
    yAxis: 'amount',
    label: 'Revenue',
  }],
} satisfies ChartDefinition<(typeof revenue)[number]>
```

같은 애플리케이션 항목을 계속 나타내는 동안에는 ID도 그대로 유지합니다. 그러면 배열에서 위치가 달라져도 데이터 갱신 뒤에 선택 상태와 현재 가리키는 항목을 다시 맞출 수 있습니다. 시간 축에는 `Date` 값이나 epoch 기준 밀리초를 나타내는 유한한 숫자를 전달할 수 있으며, 문자열을 해석하고 시간대 규칙을 정하는 일은 애플리케이션이 담당합니다.

중첩 필드 접근, 스케일 선택, 사용자 정의 범위, 데이터 교체, 검증 실패는 [데이터와 스케일](./chart/model)에서 자세히 설명합니다.

## 필요한 차트에만 이동과 확대·축소 추가하기

선택 상태와 현재 보이는 축 범위는 서로 독립적입니다. 축을 이동하거나 확대·축소하려면 해당 축에 표시 범위를 바꿀 수 있는 기능을 명시해야 합니다. 직교 좌표를 쓴다는 이유만으로 정적인 차트에 탐색 동작이 자동으로 추가되지는 않습니다.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({
  definition,
  viewCapabilities: [{
    axisID: 'date',
    minimumSpan: 86_400_000,
    update: 'follow-end',
  }],
})

const result = controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.5,
  phase: 'settled',
})

if (!result.ok) {
  console.error(result.error.code)
}
```

브라우저 연결은 애플리케이션이 차트의 마우스 휠 동작을 명시적으로 켜지 않는 한 일반적인 페이지 스크롤을 그대로 둡니다. 이동과 확대·축소는 화면에 보이는 조작 수단으로 제공하는 편이 포인터·키보드·보조 기술 사용자가 기능을 찾고 사용하기 쉽습니다.

선택, 제어 상태, 여러 차트가 공유하는 축 범위, 키보드 이동, 입력 정책은 [상호작용과 상태](./chart/interaction)에서 설명합니다.

## 렌더링을 누가 맡을지 정하기

Vue에서는 [`@sectile/vue/chart`](./chart/vue)가 `ChartRoot`, 축, 레이어, 이동 컨트롤, Canvas 렌더러를 제공합니다. 기존 브라우저 HTML에서는 [`@sectile/dom/chart`](./chart/dom)가 애플리케이션이 소유한 컨테이너와 Canvas를 차트 상태에 연결합니다. 두 연결 모두 브라우저 크기 측정과 접근성 자원을 관리하며 각 환경의 생명주기에 맞춰 정리합니다.

화면 환경과 무관한 상태만 필요하거나, 다른 형식으로 그래픽을 내보내거나, 자체 렌더러를 구현한다면 `@sectile/chart`를 직접 사용합니다. 실행 API는 용도별 하위 경로에서 가져오며 패키지 루트는 타입만 내보냅니다. 지원하는 공개 경로 전체는 [Chart API 참조](/ko/api/chart)에 정리되어 있습니다.

Vue와 DOM 안내에는 각 연결에 필요한 정확한 설치 패키지가 나와 있습니다. Chart는 호스트 패키지의 선택적 peer dependency이므로 다른 Sectile Vue나 DOM 기능만 사용할 때는 설치할 필요가 없습니다. 데이터 가져오기, 로딩·오류 화면, 색과 배치, 값 형식, 주석, 제어 상태 저장은 애플리케이션이 담당합니다.

## 데이터를 바꿔도 상호작용 상태 유지하기

새 데이터가 도착하면 레이어의 데이터를 교체하고 차트 정의를 갱신합니다. 차트 정의를 사용하는 컨트롤러는 새 축과 레이어, ID, 데이터를 검사한 뒤에만 새 정의를 적용합니다.

앞에서 만든 `definition`과 `controller`를 그대로 사용합니다.

```ts
const nextRevenue = [
  { id: 'week-27', date: new Date('2026-07-06'), amount: 131_000 },
  { id: 'week-28', date: new Date('2026-07-13'), amount: 145_000 },
  { id: 'week-29', date: new Date('2026-07-20'), amount: 140_000 },
  { id: 'week-30', date: new Date('2026-07-27'), amount: 163_000 },
]

const nextDefinition = {
  ...definition,
  layers: [{
    ...definition.layers[0],
    data: nextRevenue,
  }],
} satisfies ChartDefinition<(typeof nextRevenue)[number]>

const replaced = controller.replaceDefinition(nextDefinition)
if (!replaced.ok) {
  console.error(replaced.error.code)
}
```

새 정의가 검증에 실패하면 현재 적용 중인 차트 상태는 그대로 유지됩니다. 바뀌지 않은 데이터 항목은 같은 ID를 유지해야 선택과 활성 데이터를 새 데이터에 다시 연결할 수 있습니다. 애플리케이션에서 나타내는 대상 자체가 달라졌다면 새 ID를 사용합니다.

## 큰 데이터의 상세도 정책을 명시하기

일반적인 차트는 원본 데이터를 그대로 사용하는 것부터 시작합니다. 현재 보이는 모든 표시를 그리는 비용이 애플리케이션의 작업 한도를 넘는다면 투영 단계에서 최대 대표 항목 수를 정할 수 있습니다. 선 차트와 데이터를 요약해서 그리는 방식에는 정해진 축약 규칙이 있으며, 다른 방식에서는 요청한 상세도를 처리할 수 없다는 결과를 반환합니다. 표시 항목을 임의로 버리지는 않습니다.

차트에 실제로 상세도 정책이 필요한 경우 [대규모 데이터](./chart/performance)를 참고합니다. 사용자 정의 그리기, 다른 형식으로 내보낼 투영 결과, 포인터 위치 찾기는 [그리기와 위치 찾기](./chart/projection)에서 별도로 다룹니다.

## 작업별 안내

- [데이터와 스케일](./chart/model)은 데이터 필드 연결, 안정적인 ID, 스케일, 범위, 데이터 교체를 다룹니다.
- [상호작용과 상태](./chart/interaction)는 선택, 키보드 접근, 제어 상태, 이동, 확대·축소를 다룹니다.
- [Vue 차트](./chart/vue)는 복합 컴포넌트, 반응형 데이터, 접근 가능한 레이블, 생명주기, SSR을 다룹니다.
- [DOM 렌더링](./chart/dom)은 기존 요소, Canvas 렌더링, 탐색 입력, 정리를 다룹니다.
- [그리기와 위치 찾기](./chart/projection)는 사용자 정의 렌더링, 내보낼 투영 결과, 포인터 조회를 다룹니다.
- [대규모 데이터](./chart/performance)는 대표 항목 수 제한과 지원하는 축약 방식을 다룹니다.
- [Chart API 참조](/ko/api/chart)에는 지원하는 공개 import 경로가 정리되어 있습니다.
