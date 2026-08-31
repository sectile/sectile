---
title: Chart 상호작용과 상태
description: 페이지 스크롤을 방해하지 않으면서 선택, 키보드, 이동, 확대·축소 기능을 추가합니다.
---

<script setup>
import ChartPackageExample from '../../../.vitepress/theme/components/ChartPackageExample.vue'
</script>

# 상호작용과 상태

차트는 선택한 데이터, 포인터 아래의 데이터, 각 축에서 현재 보이는 범위를 관리할 수 있습니다. 이 상태를 Sectile에 맡기거나 앱의 상태와 연결할 수 있습니다.

<ChartPackageExample kind="scatter" />

## 표시 범위를 만든 뒤 조작 방법 추가하기

축을 옮기거나 확대하려면 먼저 그 축에 `viewCapabilities`를 추가합니다. 여기서 사용자가 얼마나 확대할 수 있는지, 데이터가 바뀌면 현재 범위를 어떻게 처리할지 정합니다. 브라우저와 키보드 조작은 그다음에 따로 켭니다.

```ts
const controller = createChartController({
  definition,
  viewCapabilities: [{
    axisID: 'date',
    minimumSpan: 86_400_000,
    update: 'follow-end',
  }],
})

const chart = createDOMChart({
  root,
  canvas,
  controller,
  navigation: { wheel: 'native', keyboard: true },
})
```

기본값인 `wheel: 'native'`에서는 차트 위에서도 페이지가 계속 스크롤됩니다. 사용자가 차트에서 휠 조작을 기대할 때만 이동이나 확대·축소에 휠을 연결하세요. 드래그와 두 손가락 확대·축소에는 같은 작업을 할 수 있는 버튼이나 다른 단일 포인터 조작도 함께 제공해야 합니다.

| 입력 방식 | 권장 용도 |
| --- | --- |
| 보이는 이동·확대·축소·초기화 버튼 | 알아보기 쉽고 접근성이 좋은 기본 선택 |
| 키보드 | 포커스를 받은 차트 탐색 |
| 드래그 이동 | 버튼도 함께 제공하는 조밀한 차트 |
| 보조 키와 휠로 확대 | 사용할 보조 키를 분명히 정한 데스크톱 분석 도구 |
| 두 손가락 확대·축소 | 버튼도 함께 제공하는 터치 화면 |
| 파이·도넛 탐색 | 적용하지 않음 |

## 앱 코드에서 같은 동작 실행하기

```ts
controller.dispatch({
  type: 'zoom-axis-view',
  axisID: 'date',
  factor: 1.5,
  anchor: 0.75,
  phase: 'settled',
})
```

`factor: 1.5`는 현재 범위를 1.5배 좁히고, `anchor: 0.75`는 범위의 4분의 3 지점을 제자리에 둡니다. 숫자·시간 축은 보이는 최솟값과 최댓값을 저장하고, 범주 축은 첫 항목과 마지막 항목을 저장합니다. 그래서 차트 크기가 바뀌어도 같은 범위를 유지할 수 있습니다.

## 애플리케이션에서 상태 제어하기

선택, 커서, 활성 데이터, 모든 축의 표시 범위를 앱 상태로 관리할 수 있습니다. 제어 중인 값이 바뀌어야 하면 Sectile은 명령을 보내고 앱이 새 값을 다시 전달할 때까지 기다립니다. Vue에서는 `v-model`, `v-model:cursor`, `v-model:active-datum`, `v-model:view`를 사용합니다.

축 ID가 같은 여러 차트에 하나의 `view` 값을 전달하면 표시 범위를 맞출 수 있습니다. 데이터가 바뀌었을 때 현재 범위를 유지하려면 `update: 'preserve'`, 새 전체 범위로 돌아가려면 `reset`, 최신 값에 붙어 움직이는 시간 창에는 `follow-end`를 사용하세요.

갱신 뒤 선택하거나 가리키던 데이터가 사라지면 Sectile이 해당 ID를 상태에서 제거합니다. 앱에서 만든 컨트롤러는 더 이상 쓰지 않을 때 `controller.dispose()`로 정리하세요.
