---
title: Chart 그리기와 위치 찾기
description: 차트를 그릴 수 있는 도형으로 바꾸고 포인터 아래의 값을 찾습니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 그리기와 위치 찾기

DOM과 Vue 연동 기능은 그리기 과정을 자동으로 처리합니다. 이 문서의 API는 사용자 정의 렌더러를 만들거나, 차트를 이미지로 내보내거나, 툴팁과 주석의 위치를 직접 정할 때만 필요합니다.

<ChartPackageExample kind="heatmap" host="dom" />

## 현재 화면에 필요한 도형 만들기

프로젝션은 주어진 너비와 높이에 그릴 도형을 담은 읽기 전용 결과입니다. 프로젝션을 만드는 것만으로 화면에 그려지지는 않습니다.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({ definition })
const projection = controller.project({
  viewport: { width: 960, height: 540, devicePixelRatio: 2 },
  maximumRepresentatives: 50_000,
})

if (!projection.ok) {
  showChartError(projection.error)
} else {
  drawBatches(projection.value.batches)
}
```

성공하면 점, 선, 사각형, 셀, 원호 묶음을 받을 수 있습니다. `maximumRepresentatives`는 결과에 포함할 그리기 항목 수를 제한합니다. 예상보다 큰 데이터가 들어와 한 프레임의 작업량이 끝없이 늘어나는 일을 막는 한도입니다.

Sectile은 이 한도에 맞추려고 데이터 표시를 몰래 버리지 않습니다. 선 차트는 화면에 보이는 높고 낮은 값을 보존하면서 점 수를 줄일 수 있습니다. 밀도 산점도와 집계 히트맵은 여러 데이터를 요약한 셀을 반환합니다. 다른 기본 모드는 보이는 표시를 모두 담을 수 없으면 오류를 반환합니다. 한도를 정하기 전에 [대규모 데이터](./performance)를 읽어 보세요.

## 포인터 아래의 값 찾기

```ts
import { hitTestChartProjection } from '@sectile/chart/query'

const [hit] = hitTestChartProjection(projection.value, {
  x: pointerX,
  y: pointerY,
  radius: 8,
  maximumHits: 1,
})

if (hit?.kind === 'datum') {
  showDatumTooltip(hit.id)
} else if (hit?.kind === 'aggregate') {
  showAggregateTooltip({
    count: hit.representative.count,
    bounds: hit.representative.bounds,
    reduction: hit.representative.reduction,
  })
}
```

일반 데이터 표시를 찾으면 원본 데이터의 ID를 받습니다. 요약 셀은 여러 데이터를 나타내므로 임의의 ID 대신 개수, 원본 값 범위, 계산 방법을 돌려줍니다. 툴팁에서도 이 차이를 드러내세요.

결과는 가까운 순서로 정렬되며 거리가 같으면 뒤에 그린 레이어가 먼저 옵니다. 한 번에 최대 256개를 반환합니다.

첫 위치 찾기 때는 빠른 검색에 쓸 자료 구조도 함께 준비합니다. 첫 가리키기부터 준비 지연이 없어야 한다면 프로젝션 성공 뒤 `prepareChartProjectionQueries(projection.value)`을 호출하세요.

## 필요할 때만 사용자 정의 렌더러 만들기

기본 데이터 표시 모양으로 부족하거나 다른 그래픽 API가 필요하면 공개 `ChartRenderer` 인터페이스를 구현합니다. 공개된 도형 묶음과 변경 번호만 읽어야 다음 버전에서도 호환성을 유지할 수 있습니다. 일반적인 축, 범례, 접근 가능한 상호작용, Canvas 그리기에는 [DOM 렌더링](./dom)이나 [Vue 차트](./vue)를 사용하세요.
