---
title: Vue 연결
description: Vue 컴포넌트에서 목록·격자·벽돌형·자유 좌표 화면을 root, 문서, 외부 스크롤 영역에 연결합니다.
---

# Vue 연결

선언형 Virtual 컴포넌트는 항목 목록과 안정적인 `getID`, 명시적인 크기 정책을 입력으로 받습니다. `VirtualList`, `VirtualGrid`, `VirtualMasonry`, `VirtualSpatial`은 컴포넌트 root뿐 아니라 현재 문서나 외부 요소·문서를 실제 scrollport로 사용할 수 있습니다. 어떤 대상을 골라도 배치 좌표는 Virtual surface 안의 좌표로 유지됩니다.

## 설치

```sh
pnpm add vue @sectile/vue @sectile/virtual
```

## root가 직접 스크롤하는 목록

`scrollport`를 생략하면 기본값인 root 모드를 사용합니다. `VirtualList`는 이 모드에서 root에 `overflow: auto`를 적용하므로, 실제 viewport가 생기도록 높이 같은 크기만 정하면 됩니다.

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
    :get-i-d="row => row.id"
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
.list { height: 24rem; }
</style>
```

`sizePolicy`는 주축 크기의 기준을 정합니다. 모든 항목 크기가 정확히 같다면 `{ kind: 'fixed', extent }`, 초기 예상값을 실제 DOM 크기로 보정하려면 `{ kind: 'estimated', estimate }`, 처음 렌더한 표본으로 초기 크기부터 구해야 한다면 `{ kind: 'measured' }`를 사용합니다. measured bootstrap도 선택한 scrollport의 투영된 viewport를 기준으로 표본 수를 정합니다.

## 페이지 스크롤 사용하기

컬렉션을 중첩 스크롤 영역에 넣지 않고 일반 페이지 흐름에 두려면 `scrollport="document"`를 지정합니다.

```vue
<VirtualMasonry
  scrollport="document"
  :items="cards"
  :get-i-d="card => card.id"
  :size-policy="{ kind: 'measured' }"
  :lane-policy="{ kind: 'responsive', minExtent: 180, maxCount: 4, gap: 12 }"
  :viewport-insets="{ top: 64 }"
>
  <template #item="{ value: card }">
    <article>{{ card.title }}</article>
  </template>
</VirtualMasonry>
```

위 예제의 `viewportInsets.top`은 페이지 위쪽을 64px 가리는 고정 또는 sticky 헤더를 나타냅니다. Sectile은 CSS를 조사해 가려진 영역을 자동으로 찾지 않습니다. Document 모드에서는 `VirtualList`도 root에 기본 `overflow: auto`를 넣지 않습니다.

선택한 문서 자체의 브라우저 realm을 사용하므로 iframe이 소유한 `Document`도 같은 낮은 수준 계약으로 처리할 수 있습니다.

## 외부 요소를 scrollport로 사용하기

Virtual 컴포넌트 바깥의 컨테이너가 스크롤을 소유한다면 그 요소를 직접 전달합니다.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { VirtualList } from '@sectile/vue/virtual/list'

const panel = useTemplateRef<HTMLElement>('panel')
</script>

<template>
  <section ref="panel" class="panel">
    <VirtualList
      :scrollport="panel"
      :items="rows"
      :get-i-d="row => row.id"
      :size-policy="{ kind: 'fixed', extent: 40 }"
    >
      <template #item="{ value: row }">{{ row.text }}</template>
    </VirtualList>
  </section>
</template>

<style scoped>
.panel { height: 24rem; overflow: auto; }
</style>
```

지원하는 대상은 `'root'`, `'document'`, `HTMLElement`, `Document`, `null`입니다. 명시적인 `null`은 물리 scrollport가 연결되지 않은 상태를 뜻하며 root 모드로 되돌아가지 않습니다. prop을 생략하면 기본값인 `'root'`를 사용합니다.

## 선언형 컴포넌트

| 컴포넌트 | 화면 | 배치별 주요 입력 |
| --- | --- | --- |
| `VirtualList` | 세로·가로 목록 | `sizePolicy`, `axis`, `gap` |
| `VirtualGrid` | 촘촘하게 채워지는 세로 흐름 격자 | `sizePolicy`, `lanePolicy`, `rowGap` |
| `VirtualMasonry` | 높이가 다른 벽돌형 카드 | `sizePolicy`, `lanePolicy`, `itemGap`, `placementPolicy` |
| `VirtualSpatial` | 앱이 좌표를 정하는 캔버스 | `getRect`, `getZIndex`, `sizeOwnership` |

Grid와 Masonry의 lane은 `{ kind: 'fixed', count: 4, gap: 12 }`처럼 개수를 고정하거나 `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }`처럼 surface 너비에 맞춰 정할 수 있습니다. 반응형 배치는 투영된 surface-local viewport를 기준으로 하므로 페이지가 세로로 이동하기만 해서는 lane을 다시 배치하지 않습니다. Spatial의 사각형 좌표도 페이지나 외부 scrollport가 움직여도 surface-local 좌표로 남습니다.

네 상위 컴포넌트는 모두 `items`, `getID`, 같은 `scrollport` 대상 형식과 `header`, `item`, `empty`, `footer` 슬롯을 사용합니다. 노출 계약도 `scrollport`, `surface`, `state`, `plan`, `phase`, `scrollToID()`, `refresh()`, `flush()`로 통일되어 있습니다. `scrollToID()`의 실제 스크롤은 선택한 호스트가 처리하므로 애플리케이션에서 페이지 좌표로 다시 변환하지 않습니다.

## 바깥 문서 흐름 때문에 위치가 바뀌었을 때

일반 스크롤, viewport resize, 항목 측정, 등록된 frame 변화는 호스트가 자동으로 반영합니다. Virtual과 관계없는 페이지 콘텐츠가 별도 신호 없이 surface 위치를 바꿨다면 노출된 `refresh()`를 호출합니다.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { VirtualMasonry } from '@sectile/vue/virtual/masonry'

const masonry = useTemplateRef<{ refresh(): void }>('masonry')

function afterExternalLayoutChange() {
  masonry.value?.refresh()
}
</script>
```

`window`의 스크롤 이벤트를 다시 전달하거나 별도의 앵커 보정 계층을 추가하지 않습니다. 페이지 스크롤과 브라우저의 범위 보정, 측정 보정은 DOM 호스트가 소유합니다.

## Document 모드의 범위

Document 스크롤은 layout viewport를 기준으로 합니다. `Window`는 별도의 대상 형식이 아니며 `VisualViewport`, pinch zoom, 가상 키보드에 따른 viewport 변화까지 같은 계약으로 다루지는 않습니다. 하나의 Virtual connection은 하나의 물리 scrollport를 선택하며 중첩된 스크롤 체인을 자동으로 찾지 않습니다. 매우 큰 논리 surface에서 생기는 브라우저의 물리 스크롤 범위 제한도 별도 문제입니다.

## 가로와 세로가 모두 큰 격자

`VirtualGrid`는 주축 방향으로 흐르는 촘촘한 lane 배치입니다. 수백 개 행과 열을 각각 가상화해야 하는 표나 일정표라면 `VirtualizerRoot`에 `trackGridLayoutStrategy`를 연결합니다. [300 × 300 격자 예제](layouts.md#트랙-격자)에서 전체 코드를 확인할 수 있습니다.

## 낮은 수준 구성 요소

직접 만든 layout strategy, 병합 셀, 별도 측정 규칙, 수동 mutation이 필요하면 `@sectile/vue/virtual/core`를 사용합니다.

- `VirtualizerRoot`: 선택한 물리 scrollport를 해석하고 연결
- `VirtualizerHeader`: 선택적인 앞쪽 frame region 렌더링
- `VirtualizerSurface`: layout 좌표 surface를 만들고 plan 크기 적용
- `VirtualizerItem`: placement 하나를 투영하고 필요한 경우 측정
- `VirtualizerFooter`: 선택적인 뒤쪽 frame region 렌더링

SSR에서 첫 visible range까지 렌더하려면 서버와 브라우저가 공유할 수 있는 결정적인 `initialViewport`를 전달합니다. `scrollport="document"`를 사용해도 서버 렌더링 중 전역 `document`를 읽지 않습니다. 실제 물리 대상은 hydration 뒤 root가 mount된 다음 해석됩니다.
