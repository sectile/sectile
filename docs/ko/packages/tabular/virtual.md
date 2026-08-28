# 선택적 Tabular 가상화

Tabular는 기본적으로 가상화하지 않으며 Vue에도 Tabular 전용 Virtual 컴포넌트를
추가하지 않습니다. 행이나 셀을 windowing할 때만 Virtual을 설치합니다.

```sh
pnpm add @sectile/vue @sectile/tabular @sectile/virtual vue
```

viewport, content, item 생명 주기는 `@sectile/vue/virtual/core`을 직접 사용합니다.
DataTable, DataGrid, DataTreeGrid projection을 안정된 linear 또는
partitioned-track 입력으로 바꿀 때만 `@sectile/tabular/virtual` adapter를
사용합니다. adapter가 Tabular를 알 뿐 Tabular controller나 component는 Virtual을
import하지 않습니다.

```ts
import { createDataGridVirtualAdapter } from '@sectile/tabular/virtual'
import { useVirtualizer } from '@sectile/vue/virtual/core'
import { shallowRef } from 'vue'

let adapter = createDataGridVirtualAdapter({
  projection: grid.getProjection(),
  rowExtents: { kind: 'uniform', extent: 44 },
  columnExtents: {
    kind: 'by-id',
    getExtent: (columnID) => columnWidths[columnID] ?? 160,
  },
})

const virtualState = shallowRef(adapter.state)
const virtualizer = useVirtualizer({
  state: virtualState,
  strategy: adapter.strategy,
})
```

adapter는 행·열·셀 ID, extent domain, pinned partition, projection generation,
locator와 다음 projection으로의 mutation을 보존합니다. `uniform`은 알고 있는 고정
크기를, `by-id`는 application이 이미 가진 열 크기나 예상 행 크기를 초기 layout에
전달합니다. mount 뒤 실제 요소 측정과 보정은 Virtual 수명 주기에서 수행합니다.

```ts
const next = reconcileDataGridVirtualAdapter(
  adapter,
  virtualState.value,
  grid.getProjection(),
)

if (next.ok) {
  for (const mutation of next.value.mutations) {
    virtualizer.mutate(mutation)
  }
  adapter = next.value.adapter
}

adapter.locateRow('user-42')
adapter.locateColumn('name')
adapter.locateCell({ rowID: 'user-42', columnID: 'name' })
```

DataTable은 세로 linear row adapter를, DataGrid와 DataTreeGrid는 start/center/end
pinning을 보존하는 partitioned-track grid adapter를 사용합니다. projection이 바뀌면
`reconcileData*VirtualAdapter`가 ID 기반 mutation과 새 adapter를 반환합니다.

기본 `@sectile/tabular`, `@sectile/dom/tabular`, Vue 프로필 진입점 import는
Virtual을 불러오지 않습니다. 반대로 `/virtual` subpath를 import하려면
`@sectile/virtual`을 명시적으로 설치해야 합니다.
