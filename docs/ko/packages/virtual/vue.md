---
title: Vue 연결
description: 선언형 Vue 컴포넌트로 목록, 반응형 격자, masonry 카드, 자유 좌표 화면을 가상화합니다.
---

# Vue 연결

선언형 Virtual 컴포넌트는 item collection과 안정적인 `getID` resolver, 명시적인 크기 정책을 입력으로 받습니다. bootstrap, ready, empty 상태가 바뀌어도 같은 scrollport와 surface를 유지합니다.

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
  <VirtualList
    :items="rows"
    :get-id="row => row.id"
    :size-policy="{ kind: 'estimated', estimate: 40 }"
    class="list"
  >
    <template #item="{ value: row }">
      <p>{{ row.text }}</p>
    </template>
    <template #empty>표시할 행이 없습니다.</template>
  </VirtualList>
</template>

<style scoped>
.list { height: 24rem; overflow: auto; }
</style>
```

`sizePolicy`는 main axis의 크기를 누가 정하는지 분명하게 나타냅니다. 모든 item 크기가 정확히 같다면 `{ kind: 'fixed', extent }`, 초기 예상값으로 시작하고 mount 뒤 실제 크기로 보정하려면 `{ kind: 'estimated', estimate }`, 첫 렌더 표본으로 초기 예상값부터 구해야 한다면 `{ kind: 'measured' }`를 사용합니다. measured bootstrap도 이후 placement가 그려질 때와 같은 surface 안에서 진행됩니다.

## 선언형 컴포넌트

| 컴포넌트 | 화면 | layout별 주요 입력 |
| --- | --- | --- |
| `VirtualList` | 세로·가로 목록 | `sizePolicy`, `axis`, `gap` |
| `VirtualGrid` | 촘촘하게 채워지는 세로 흐름 격자 | `sizePolicy`, `lanePolicy`, `rowGap` |
| `VirtualMasonry` | 높이가 다른 masonry 카드 | `sizePolicy`, `lanePolicy`, `itemGap`, `placementPolicy` |
| `VirtualSpatial` | 앱이 좌표를 정하는 캔버스 | `getRect`, `getZIndex`, `sizeOwnership` |

Grid와 Masonry의 lane은 `{ kind: 'fixed', count: 4, gap: 12 }`처럼 개수를 고정하거나 `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }`처럼 surface 너비에 맞춰 반응형으로 정할 수 있습니다. Spatial은 `getRect`가 width와 height까지 소유하면 `sizeOwnership: 'declared'`, 위치만 소유하고 mount된 DOM 크기를 width와 height로 사용하면 `'mounted'`를 선택합니다.

네 high-level 컴포넌트는 모두 `items`, `getID`와 `header`, `item`, `empty`, `footer` named slot을 사용합니다. expose 계약도 `scrollport`, `surface`, `state`, `plan`, `phase`, `scrollToID()`, `refresh()`, `flush()`로 통일되어 있습니다. host element가 아직 연결되지 않은 시점에도 `scrollToID()`와 `flush()`는 undefined나 예외 대신 controlled result를 반환합니다.

sticky 또는 overlay UI가 viewport 일부를 계속 가린다면 `viewportInsets`로 그 영역을 명시합니다. `header`와 `footer`는 item domain 바깥의 일반 frame region이며 synthetic virtual item으로 취급하지 않습니다.

## 가로와 세로가 모두 큰 격자

`VirtualGrid`는 dense lane layout을 만들고 main axis 방향으로 흐릅니다. 수백 개 행과 수백 개 열을 서로 독립적으로 windowing해야 하는 표나 일정표라면 `VirtualizerRoot`에 `trackGridLayoutStrategy`를 연결합니다. [300 × 300 격자 예제](layouts.md#트랙-격자)에서 전체 코드를 확인할 수 있습니다.

## 낮은 수준 구성 요소

custom layout strategy, 병합 셀, 별도 측정 규칙, 수동 mutation이 필요하면 `@sectile/vue/virtual/core`를 사용합니다.

- `VirtualizerRoot`: layout state와 scrollport 연결
- `VirtualizerHeader`: 선택적인 앞쪽 frame region 렌더링
- `VirtualizerSurface`: layout 좌표 surface를 만들고 plan 크기 적용
- `VirtualizerItem`: placement 하나를 투영하고 필요한 경우 측정
- `VirtualizerFooter`: 선택적인 뒤쪽 frame region 렌더링

SSR에서 첫 visible range까지 렌더하려면 서버와 브라우저가 공유할 수 있는 결정적인 `initialViewport`를 전달합니다. 생략하면 브라우저가 host element를 mount한 뒤 첫 plan을 만듭니다.
