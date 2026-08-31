---
title: Chart 데이터와 스케일
description: 좌표와 축을 선언하고, 업무 필드를 읽고, ID를 보존하며, 불변 데이터를 교체합니다.
---

# 데이터와 스케일

선언형 definition부터 시작합니다. 좌표계와 각 축, 데이터 레이어가 뜻하는 차트 종류를 함께 이름 붙입니다.

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

유효한 `Date`와 유한한 epoch millisecond 숫자가 temporal 입력입니다. 날짜 문자열은 거부하므로 parsing과 시간대 정책이 애플리케이션 코드에 드러납니다.

## 관례적인 record는 단순하게 두기

각 datum에는 안정적인 문자열 또는 safe integer ID가 필요합니다. Sectile은 `getId`, canonical `id` 필드 순서로 값을 찾습니다. 기존 숫자형 DB key를 문자열로 변환할 필요가 없습니다.

직교 값은 layer `getX`/`getY`, axis `getValue`, axis `field`, canonical `x`/`y` 순서로 찾습니다. 방사형 값은 `getValue`, `valueField`, `value` 순서이며 label은 `getLabel`, `labelField`, `label` 순서입니다. record 자체로 관계를 표현할 수 없을 때만 accessor를 사용합니다.

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

Axis ID는 coordinate 안에서 고유해야 합니다. Layer와 datum ID는 compile된 chart generation을 공유하므로 모든 layer에서 고유하게 유지하고, 실세계 항목이 같은 동안 datum ID도 보존합니다.

## Domain에 맞는 scale 선택하기

| Scale | 입력 | Domain |
| --- | --- | --- |
| `linear` | 유한한 숫자 | 자동 또는 명시적 최솟값/최댓값 |
| `logarithmic` | 양의 유한한 숫자 | 자동 또는 명시적 양의 최솟값/최댓값 |
| `temporal` | `Date` 또는 epoch millisecond | 자동 또는 명시적 temporal 범위 |
| `categorical` | 문자열 또는 숫자 | 최초 등장 순서 또는 명시적 값 목록 |

자동 domain은 선언된 layer 값에서 구합니다. Bar의 measure axis에는 0 기준선이 포함됩니다. 여러 차트를 같은 기준으로 비교하려면 explicit domain을 사용합니다.

## 반응형 데이터는 불변 교체하기

데이터 배열 하나를 shallow reactive boundary로 봅니다. 새 query 결과를 받으면 배열을 교체합니다. Record를 제자리에서 바꾸고 Chart가 deep change를 찾을 것이라 기대하지 않습니다.

```ts
revenue.value = response.points
```

Vue는 shallow 입력이 바뀐 선언만 다시 발행합니다. Core는 ID와 값이 허용하는 범위에서 바뀌지 않은 layer ownership을 재사용하고 selection, cursor, axis view를 조정합니다.

저수준 `ChartModel`과 `ChartPatch`는 이미 packed profile operation을 만드는 pipeline에 남아 있습니다. 선언형 field와 자동 domain 조립을 우회하므로 axis 관측값이 바뀔 수 있다면 `replaceDefinition()`을 사용합니다.

## 경계에서 잘못된 데이터 거부하기

생성과 교체는 원자적입니다. 중복 ID, 호환되지 않는 좌표, 잘못된 temporal 값, 유한하지 않은 숫자, 초과한 제한은 아무 상태도 발행하지 않습니다. 신뢰하는 애플리케이션 데이터에는 throwing API를, transport나 사용자 입력 경계에는 대응하는 `try*` API를 사용합니다.
