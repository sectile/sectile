---
title: Vue 연결
description: 선언형 마크업으로 목록, 반응형 격자, 벽돌형 카드, 자유 좌표 화면을 가상화합니다.
---

# Vue 연결

`@sectile/vue/virtual/list`은 자료 배열과 안정적인 키, 슬롯 마크업을 받아 실제 요소의 크기를 자동으로 측정합니다.

## 설치

```sh
pnpm add vue @sectile/vue @sectile/virtual
```

## 목록

```vue
<script setup lang="ts">
import { VirtualList } from '@sectile/vue/virtual/list'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: `row-${index}`,
  text: `Row ${index + 1}`,
}))
</script>

<template>
  <VirtualList :items="rows" :get-key="row => row.id" class="list">
    <template #default="{ value: row }">
      <p>{{ row.text }}</p>
    </template>
  </VirtualList>
</template>

<style scoped>
.list { height: 24rem; }
</style>
```

크기 속성을 생략하면 가상 배치를 만들기 전에 첫 DOM 표본을 측정합니다. 목록은 첫 렌더 범위, 격자는 첫 행, 벽돌형은 첫 레인 묶음을 표본으로 사용하므로 항목 DOM이 복잡할수록 이 초기 측정 비용도 커집니다. `estimateSize`는 시작 예상값을 직접 제공하며, `itemSize`는 모든 항목이 같은 정확한 크기일 때 측정을 생략합니다.

## 선언형 컴포넌트

| 컴포넌트 | 화면 | 주요 입력 |
| --- | --- | --- |
| `VirtualList` | 세로·가로 목록 | `items`, `getKey`, `axis` |
| `VirtualGrid` | 너비에 따라 열 수가 바뀌는 세로 격자 | `minLaneSize`, `maxLaneCount` |
| `VirtualMasonry` | 높이가 다른 카드 모음 | `minLaneSize`, `placementPolicy` |
| `VirtualSpatial` | 앱이 좌표를 가진 캔버스 | `getRect`, `getZIndex` |

네 컴포넌트는 `items`, `getKey`, 기본 슬롯을 같은 방식으로 사용합니다. 루트 요소가 스크롤 영역이므로 CSS의 `height`, `max-height`, flex 또는 grid 배치로 viewport 크기를 정합니다.

## 가로와 세로가 모두 큰 격자

`VirtualGrid`는 화면 너비 안의 열 수를 반응형으로 정하고 세로 방향으로 흐릅니다. 수백 개 행과 수백 개 열을 독립적으로 스크롤하는 표·일정표에는 `VirtualizerRoot`와 `trackGridLayoutStrategy`를 연결합니다. [300 × 300 격자 예제](layouts.md#트랙-격자)에서 전체 코드를 확인할 수 있습니다.

## 낮은 수준 구성 요소

병합 셀, 역방향 축, 별도 측정 규칙에는 다음 구성 요소와 `useVirtualizer()`를 사용합니다.

- `VirtualizerRoot`: 상태와 배치 전략 연결
- `VirtualizerContent`: 전체 콘텐츠 크기 적용
- `VirtualizerItem`: placement 좌표와 측정 연결

서버에서 첫 화면을 함께 만들 때는 서버와 브라우저가 공유하는 `initialViewport`를 전달합니다.
