---
title: Chart 상호작용과 상태
description: hover, 선택, 키보드 focus, 이동과 확대를 하나의 명시적인 차트 상태로 다룹니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 상호작용과 상태

Chart는 pointer, 키보드, 이동, 확대 입력을 화면 표현과 무관한 하나의 상태로 바꿉니다. DOM과 Vue 연결은 일반적인 브라우저 동작을 자동으로 이어 줍니다. 애플리케이션은 같은 상태를 읽고, 이벤트를 직접 보내거나, 선택된 값을 외부에서 제어할 수 있습니다.

<ChartPackageExample kind="scatter" />

## 기본 브라우저 동작

| 입력 | 결과 |
| --- | --- |
| 마크 위로 pointer 이동 | 활성 데이터를 갱신 |
| 마크 선택 | 해당 데이터를 선택하고 키보드 cursor 이동 |
| 방향키 | 이전 또는 다음 데이터로 cursor 이동 |
| Home / End | 첫 번째 또는 마지막 데이터로 이동 |
| 휠 | 화면 이동 |
| Ctrl/⌘ + 휠 | pointer 위치를 기준으로 확대·축소 |
| Escape | 이동과 확대 상태 초기화 |

차트 root는 키보드 focus를 받을 수 있고, 개수가 제한된 데이터 목록을 보조 기술에 제공합니다. ID 대신 의미 있는 설명이 전달되도록 DOM 옵션의 `getAccessibleDatumLabel`을 설정하세요.

## 이벤트 보내기

```ts
const update = controller.dispatch({
  type: 'set-selection',
  selection: { type: 'points', ids: ['search'] },
})

if (update.ok) {
  console.log(update.value.snapshot.state.selection)
}
```

상태에는 활성 데이터, 키보드 cursor, 점 또는 구간 선택, 화면 변환이 들어 있습니다. 이벤트는 다른 차트 상태를 숨기지 않고 필요한 부분만 갱신합니다.

## 애플리케이션에서 상태 제어하기

다른 store가 값을 소유한다면 `activeDatum`, `cursor`, `selection`, `viewTransform`을 controlled 값으로 전달합니다. 그러면 Chart는 해당 값을 직접 확정하지 않고 변경을 요청합니다. 소유자는 `syncControlledValues()`를 호출하거나, Vue에서는 대응하는 `v-model`을 갱신해 새 값을 적용합니다.

Chart가 값을 소유해야 한다면 기본값을 사용합니다.

```ts
const controller = createChartController({
  model,
  initialValues: {
    selection: { type: 'points', ids: [] },
  },
})
```

데이터를 교체하면 Chart가 더 이상 존재하지 않는 ID를 활성 데이터, cursor, 점 선택에서 제거합니다. 애플리케이션이 소유한 컨트롤러를 더 사용하지 않을 때는 `dispose()`를 호출하세요.
