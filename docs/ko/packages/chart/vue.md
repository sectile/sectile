---
title: Vue Chart 구성
description: Vue ref로 차트 상태를 소유하고 headless ChartRoot를 DOM 렌더링에 연결합니다.
---

# Vue Chart 구성

Chart subpath를 사용할 때만 Chart를 설치합니다. Chart는 두 host package의 optional peer입니다.

```sh
pnpm add vue @sectile/chart @sectile/dom @sectile/vue
```

## Composable

`useChart()`는 ref, getter 또는 일반 model을 받습니다. Controlled 값에는 writable ref를, controller가 소유할 상태에는 `default*` 값을 전달합니다.

```ts
import { shallowRef } from 'vue'
import { useChart } from '@sectile/vue/chart'

const selection = shallowRef({ type: 'points' as const, ids: [] })
const chart = useChart({
  model: () => props.model,
  selection,
  onCommand(command) {
    audit(command)
  },
})

chart.dispatch({ type: 'zoom', x: 320, y: 180, factor: 1.2 })
```

결과는 controller, revision snapshot, 현재 projection과 DOM connection을 shallow ref로 제공하고 replacement, patch, dispatch, sync, dispose method를 제공합니다. Vue effect scope가 있으면 소유한 controller를 자동으로 dispose합니다.

## Component

```vue
<script setup lang="ts">
import { ChartRoot, ChartCanvas } from '@sectile/vue/chart'

const options = { model: () => model.value }
</script>

<template>
  <ChartRoot :options="options" class="chart">
    <ChartCanvas />
  </ChartRoot>
</template>
```

`ChartRoot`는 `options` 또는 외부 소유 `controller` 중 정확히 하나를 받습니다. Default slot은 controller, snapshot, state와 projection을 제공합니다. `ChartCanvas`는 DOM connection이 쓸 canvas를 등록합니다. 두 component 모두 style을 정하지 않고 안정적인 `data-scope="chart"`와 `data-part`를 제공합니다.

DOM connection과 renderer는 mount 이후에만 생성되므로 setup은 SSR-safe합니다. Hydration을 결정적으로 유지하려면 server와 client에 같은 model과 초기 controlled 값을 제공해야 합니다.

