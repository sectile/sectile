---
title: Chart 데이터와 스케일
description: 앱의 데이터 필드를 차트 축에 연결하고, 알맞은 스케일을 고르며, 데이터를 안전하게 갱신합니다.
---

# 데이터와 스케일

차트 정의에는 어떤 데이터를 그리고 각 축에서 어떤 필드를 읽을지 적습니다. 다음 예제는 `date`와 `amount` 필드로 주간 매출을 그립니다.

```ts
import type { ChartDefinition } from '@sectile/chart/definition'

const revenue = [
  { id: 271, date: new Date('2026-07-06'), amount: 128_000 },
  { id: 272, date: new Date('2026-07-13'), amount: 142_000 },
  { id: 273, date: new Date('2026-07-20'), amount: 137_000 },
]

const definition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'date', orientation: 'x', scale: 'temporal', field: 'date', label: '주' },
    { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount', label: '매출' },
  ] },
  layers: [{
    kind: 'line', id: 'weekly-revenue', data: revenue,
    xAxis: 'date', yAxis: 'amount', label: '매출',
  }],
} satisfies ChartDefinition<(typeof revenue)[number]>
```

`field`에는 각 데이터 객체의 속성 이름을 적습니다. 선 레이어는 자신이 쓸 두 축을 ID로 가리킵니다. 시간 축에는 유효한 `Date`나 밀리초 단위의 유한한 숫자를 전달하세요. 날짜 문자열은 앱에서 먼저 변환해야 시간대 처리 방식을 분명하게 유지할 수 있습니다.

## 각 데이터에 안정적인 ID 붙이기

화면에 그리는 데이터마다 문자열 또는 안전한 정수 ID가 필요합니다. 객체에 `id` 필드가 있으면 Sectile이 자동으로 사용합니다. 같은 실제 항목을 나타내는 동안 ID를 바꾸지 않으면 데이터를 새로 받아도 선택과 가리키기 상태를 유지할 수 있습니다.

필요한 값이 객체 안쪽에 있거나 계산해야 할 때만 `getId`, `getX`, `getY` 같은 함수를 전달합니다.

```ts
const layer = {
  kind: 'scatter',
  id: 'service-health',
  data: services,
  getId: service => service.key,
  getX: service => service.deployments.last30Days,
  getY: service => service.slo.successRate,
  xAxis: 'deployments',
  yAxis: 'stability',
} as const
```

축 ID는 차트 안에서 겹치면 안 됩니다. 레이어 ID와 데이터 ID도 차트의 모든 레이어를 통틀어 고유해야 합니다.

파이와 도넛에서는 `id`, `value`, `label` 필드가 있는 데이터를 바로 쓸 수 있습니다. 속성 이름이 다르면 `valueField`와 `labelField`로 연결하세요.

## 필드에 맞는 스케일 고르기

| 스케일 | 받을 수 있는 값 | 알맞은 데이터 |
| --- | --- | --- |
| `linear` | 유한한 숫자 | 금액, 개수, 비율 등 일반적인 숫자 범위 |
| `logarithmic` | 0보다 큰 유한한 숫자 | 자릿수 차이가 큰 양수 값 |
| `temporal` | `Date` 또는 밀리초 숫자 | 날짜와 시간 |
| `categorical` | 문자열 또는 숫자 | 정해진 순서의 이름 있는 항목 |

기본값에서는 데이터의 최솟값과 최댓값으로 축의 표시 범위를 정합니다. 이 범위를 축 도메인이라고 합니다. 막대 차트의 값 축에는 0도 포함됩니다. 여러 차트를 같은 기준으로 비교해야 한다면 표시 범위를 직접 지정하세요.

## 데이터가 바뀌면 배열 교체하기

Sectile은 데이터 객체의 모든 속성을 계속 감시하지 않고 배열 참조가 바뀌었는지 확인합니다. 요청이나 구독으로 새 값을 받으면 배열을 통째로 교체하세요.

```ts
revenue.value = response.points
```

Vue에서는 큰 데이터 배열을 `shallowRef`에 두는 편이 알맞습니다. 레이어가 여러 개라면 데이터가 바뀌지 않은 레이어의 배열은 같은 참조로 유지하세요.

Vue를 쓰지 않는다면 레이어의 데이터를 바꾼 뒤 `controller.replaceDefinition(nextDefinition)`을 호출합니다. 이 메서드는 결과 객체를 반환하므로 새 데이터가 잘못됐을 때 기존 차트를 그대로 유지할 수 있습니다.

`ChartModel`과 `ChartPatch`는 데이터 원본이 이미 차트용 증분 작업을 만드는 경우를 위한 고급 API입니다. 대부분의 앱은 축 범위까지 다시 계산해 주는 정의 방식을 쓰면 됩니다.

`controller.applyPatch()`는 `model`을 넘겨 만든 컨트롤러에서만 사용할 수 있습니다. `definition`을 소유하는 컨트롤러는 저수준 패치를 거부합니다. 이런 컨트롤러의 데이터는 `replaceDefinition()`으로 갱신해야 축, 해석된 레이어, 진단 정보, 투영 상태가 같은 세대로 함께 다시 계산됩니다.

## 잘못된 데이터 처리하기

Sectile은 중복 ID, 맞지 않는 축, 잘못된 날짜, 유한하지 않은 숫자, 설정한 한도를 넘는 데이터를 거부합니다. 데이터 교체에 실패하면 현재 차트는 바뀌지 않습니다.

잘못된 입력을 개발 중 오류로 처리해도 되는 곳에서는 `createChartController`를 쓰세요. 네트워크나 사용자 입력에서 온 데이터를 다룰 때는 `tryCreateChartController` 또는 `replaceDefinition`의 결과를 확인해 앱의 오류 화면으로 연결하세요.
