# 선택적 Tabular 가상화

Tabular는 기본적으로 가상화하지 않으며 Vue에도 Tabular 전용 Virtual 컴포넌트를
추가하지 않습니다. 행이나 셀을 windowing할 때만 Virtual을 설치합니다.

```sh
pnpm add @sectile/vue @sectile/virtual vue
```

viewport, content, item 생명 주기는 `@sectile/vue/virtual`을 직접 사용합니다.
DataTable, DataGrid, DataTreeGrid projection을 안정된 linear 또는
partitioned-track 입력으로 바꿀 때만 `@sectile/tabular/virtual` adapter를
사용합니다.

```ts
import { createDataGridVirtualAdapter } from '@sectile/tabular/virtual'
import { useVirtualizer } from '@sectile/vue/virtual'

const adapter = createDataGridVirtualAdapter({ controller: grid.controller })
const virtualizer = useVirtualizer({ strategy: adapter.strategy })
```

adapter는 행·열·셀 ID, 측정한 extent, pinned partition, projection generation,
locator, reveal target을 보존합니다. Virtual이 mount된 요소를 내부에서 측정하므로
응용 프로그램이 별도 `measure` 정책이나 고정 높이를 제공할 필요는 없습니다.

기본 `@sectile/tabular`, `@sectile/dom/data-*`, `@sectile/vue/data-*` import는
Virtual을 불러오지 않습니다. 반대로 `/virtual` subpath를 import하려면
`@sectile/virtual`을 명시적으로 설치해야 합니다.
