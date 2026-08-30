---
title: Chart 상호작용과 controller
description: Selection, cursor, active datum, pan과 zoom을 명시적인 controlled ownership으로 조합합니다.
---

# 상호작용과 controller

Chart state에는 active datum, keyboard cursor, point 또는 interval selection과 view transform이 있습니다. Event는 pointer candidate, focus 이동, selection 변경, pan, zoom과 reset을 표현하는 이식 가능한 데이터입니다. Transition은 immutable state와 host가 실행할 command를 반환합니다.

```ts
import { createChartController } from '@sectile/chart/controller'

const controller = createChartController({
  model: input,
  initialValues: {
    selection: { type: 'points', ids: [] },
  },
})

const update = controller.dispatch({ type: 'move-focus', direction: 'first' })
if (update.ok) console.log(update.value.snapshot.state.cursor)
```

`activeDatum`, `cursor`, `selection`, `viewTransform` 중 응용 프로그램이 소유할 값을 `controlled`로 전달합니다. Controlled shape은 controller 수명 동안 고정됩니다. 해당 event는 값을 직접 반영하지 않고 `*-change-requested` command를 내보내며 소유자는 `syncControlledValues()`로 승인한 값을 적용합니다.

Model 교체와 patch는 삭제된 ID를 active, cursor와 point selection에서 정리합니다. Controller method는 expected revision을 받아 오래된 호출을 failure-atomic하게 거부하고 최신 projection을 cache합니다. `dispose()`를 호출하면 command listener와 보관한 projection을 해제합니다.

신뢰하지 않는 사용자·transport 입력을 처리할 때는 `tryCreate*`와 다른 `try*` 함수를 사용합니다. Throwing 함수는 이미 검증된 응용 프로그램 데이터에 적합합니다.

