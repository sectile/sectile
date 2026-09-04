# 선택적 Tabular 가상화

Tabular는 기본적으로 가상화하지 않으며 Vue에도 Tabular 전용 Virtual 컴포넌트를 추가하지 않습니다. 행이나 셀을 windowing할 때만 Virtual을 설치합니다. Tabular adapter는 projection을 layout으로 옮기는 역할만 소유하고, frame region·mount된 element·measurement·물리 scroll은 Vue/DOM Virtual host가 담당합니다.

```sh
pnpm add @sectile/vue @sectile/tabular @sectile/virtual vue
```

DataTable, DataGrid, DataTreeGrid projection을 Virtual state와 strategy로 바꿀 때는 `@sectile/tabular/virtual` entry point를 사용합니다. 만들어진 state와 strategy는 `@sectile/vue/virtual/core` 또는 `@sectile/dom/virtual` host에 전달합니다.

```ts
import {
  createDataGridVirtualAdapter,
  createDataTableVirtualAdapter,
  reconcileDataGridVirtualAdapter,
} from '@sectile/tabular/virtual'

let adapter = createDataGridVirtualAdapter({
  projection: grid.getProjection(),
  rowExtents: {
    kind: 'uniform',
    extent: { kind: 'estimated', value: 44 },
  },
  columnExtents: {
    kind: 'by-id',
    getExtent: (columnID) => ({
      kind: 'exact',
      value: columnWidths[columnID] ?? 160,
    }),
  },
})
```

adapter는 행·열·셀 ID, extent domain, pinned partition, projection generation, locator와 projection mutation을 보존합니다. 전체 track domain이 같은 시작 extent를 쓰면 `uniform`, 행이나 열마다 application이 별도 extent를 제공하면 `by-id`를 사용합니다. Mount된 실제 크기는 이후 Virtual host의 measurement 경로에서 보정할 수 있습니다.

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

DataTable은 세로 Linear row adapter를 사용합니다. 생성할 때 surface-local 유효 행 너비를 `crossExtent`로 넘겨야 하며, 그래야 row placement와 `contentSize.width`가 placeholder가 아니라 실제 Virtual surface 너비와 일치합니다.

```ts
const tableAdapter = createDataTableVirtualAdapter({
  projection: table.getProjection(),
  rowExtents: {
    kind: 'uniform',
    extent: { kind: 'estimated', value: 40 },
  },
  crossExtent: surfaceWidth,
})
```

DataGrid와 DataTreeGrid는 start/center/end pinned track을 Virtual item domain 안에 유지하는 partitioned-track layout을 사용합니다. 반면 바깥쪽 `VirtualizerHeader`와 `VirtualizerFooter`는 host frame에 속합니다. Header/footer를 pinned track이나 synthetic cell로 만들지 않아야 frame offset과 pinned suppression이 이중 적용되지 않습니다.

기본 `@sectile/tabular`, `@sectile/dom/tabular`, Vue Tabular entry point import는 Virtual을 불러오지 않습니다. `@sectile/tabular/virtual`, `@sectile/dom/virtual`, `@sectile/vue/virtual/core`를 사용할 때만 optional peer인 `@sectile/virtual`이 필요하므로 가상화는 명시적인 opt-in으로 남습니다.
