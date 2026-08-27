# Vue에서 Tabular 사용하기

기본 프로필에는 Vue만 설치하면 됩니다. `@sectile/tabular`와
`@sectile/dom`은 `@sectile/vue`의 직접 의존성이므로 공개 컴포넌트 타입을
받기 위해 응용 프로그램에 따로 설치할 필요가 없습니다.

```sh
pnpm add @sectile/vue vue
```

```vue
<script setup lang="ts">
import { ref } from 'vue'
import {
  DataTableBody,
  DataTableCell,
  DataTableColumnHeader,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableProvider,
  DataTableRoot,
  DataTableRow,
  defineDataTableColumns,
  useDataTable,
} from '@sectile/vue/data-table'

interface User { id: string; name: string }
const rows = ref<User[]>([{ id: 'u1', name: 'Ada' }])
const columns = defineDataTableColumns([
  { id: 'name', getValue: (row: User) => row.name },
])
const table = useDataTable({ columns })
</script>

<template>
  <DataTableProvider :controller="table">
    <DataTableRoot name="selected-users">
      <DataTableHeader><DataTableHeaderRow>
        <DataTableColumnHeader header-node-id="name">이름</DataTableColumnHeader>
      </DataTableHeaderRow></DataTableHeader>
      <DataTableBody>
        <DataTableRow v-for="row in rows" :key="row.id" :row-id="row.id">
          <DataTableCell :row-id="row.id" column-id="name">{{ row.name }}</DataTableCell>
        </DataTableRow>
      </DataTableBody>
    </DataTableRoot>
  </DataTableProvider>
</template>
```

Provider에 controller를 한 번 전달하면 Root와 모든 하위 part가 inject로 받습니다.

## 공개 API

| 프로필 | 생성·context | 구조 | 조작·편집 |
| --- | --- | --- | --- |
| DataTable | `useDataTable`, `useDataTableSource`, `useDataTableContext`, `defineDataTableColumns`, `Provider`, `Root` | `Caption`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `SelectionControl`, `BulkSelectionControl`, `Disclosure`, `ColumnResizeHandle`, `Editor` |
| DataGrid | `useDataGrid`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`, `Provider`, `Root` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor` |
| DataTreeGrid | `useDataTreeGrid`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`, `Provider`, `Root` | `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell` | `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor` |

모든 part는 `Props`와 `SlotProps` 타입을 내보냅니다. 각 프로필은 같은
`@sectile/vue/data-*` 경로와 Vue root에서 행·열·질의·view·source·status·error,
command/controller/context, accepted view와 access/request 상태, change handler,
resolver, `Use*Options`, `Use*SourceOptions`, `Use*SourceReturn` 타입을 제공합니다.

`useData*Source`는 controller 하나에 executor 하나만 연결하고 mount 뒤에 실행합니다.
교체한 작업은 취소하고 stale 완료는 무시합니다. loading·empty·error UI는 source
status를 바탕으로 응용 프로그램이 구성합니다. SSR에서는 resolver를 실행하지 않으며
hydration 초기 view가 같아야 합니다.
