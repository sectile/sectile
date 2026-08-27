<script setup>
import TabularDataGridDemo from '../../../.vitepress/theme/components/TabularDataGridDemo.vue'
</script>

# DataGrid

DataGrid는 평면 application grid 프로필입니다. 셀 사이를 이동하고 grid를 벗어나지 않은 채 값을 편집하는 작업 보드, 권한 matrix, 재고 관리, editor에 사용합니다.

<TabularDataGridDemo />

셀을 누른 뒤 방향키로 이동하고 Enter로 편집하고 Escape로 취소해 보세요. 행 checkbox는 현재 cell과 독립적입니다. 정렬로 accepted view가 바뀌어도 프로필 계약은 유지됩니다.

::: details 동작하는 전체 예제 source
<<< ../../../.vitepress/theme/components/TabularDataGridDemo.vue
:::

## grid 구성

DataGrid는 native table element가 아니라 ARIA grid 의미를 사용합니다. accepted view의 모든 행은 leaf여야 하며 계층형 response는 상태를 일부 변경하지 않고 원자적으로 거부됩니다.

```vue
<DataGridProvider :controller="grid">
  <DataGridRoot aria-label="출시 작업" @command="handleCommand">
    <DataGridHeader><DataGridHeaderRow :depth="0">
      <DataGridColumnHeader headerNodeID="task">작업</DataGridColumnHeader>
      <DataGridColumnHeader headerNodeID="owner">담당자</DataGridColumnHeader>
    </DataGridHeaderRow></DataGridHeader>
    <DataGridBody>
      <DataGridRow v-for="row in acceptedRows" :key="row.id" :rowID="row.id">
        <DataGridCell :rowID="row.id" columnID="task">{{ row.cells.task }}</DataGridCell>
        <DataGridCell :rowID="row.id" columnID="owner">{{ row.cells.owner }}</DataGridCell>
      </DataGridRow>
    </DataGridBody>
  </DataGridRoot>
</DataGridProvider>
```

## cursor와 keyboard 이동

controller는 DOM focus가 아니라 cell address를 소유합니다. DOM 연결은 tab stop 하나를 투영하고 보이는 셀 사이를 이동하며 현재 셀이 mount되지 않았으면 reveal 요청을 보냅니다. 응용 프로그램이 `focus-cell`과 `move-cell`을 직접 dispatch할 수도 있습니다.

```ts
grid.dispatch({ type: 'focus-cell', cell: { rowID: 'task-1', columnID: 'owner' } })
grid.dispatch({ type: 'move-cell', direction: 'down' })
```

## 편집과 검증

편집할 열에 `edit` capability를 표시하고 각 cell에 `DataGridEditor`를 둡니다. Enter로 시작하고 Enter로 commit하며 Escape로 cancel합니다. `parseValue`는 구조화된 실패를 반환할 수 있습니다. commit command 뒤의 저장과 optimistic update는 응용 프로그램 책임입니다.

행이나 열이 source response에서 사라지면 editor를 먼저 취소한 뒤 남은 cell로 cursor를 결정적으로 옮깁니다. source 교체 역시 편집을 취소하고 replacement view를 요청합니다.

## 선택, 열 상태, 큰 데이터

`DataGridRowSelectionControl`과 `DataGridBulkSelectionControl`은 cell cursor와 별도로 행을 선택합니다. column state에는 순서, 숨김, start/end pinning이 포함됩니다. `DataGridColumnResizeHandle`은 host가 소유한 크기를 투영합니다. 큰 화면만 `@sectile/vue/virtual`과 선택적 Tabular adapter를 조합합니다.

## 공개 Vue API

- 생성: `useDataGrid`, `useDataGridSource`, `useDataGridContext`, `defineDataGridColumns`
- context: `DataGridProvider`, `DataGridRoot`
- 구조: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- 조작: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `ColumnResizeHandle`, `Editor`

각 part의 `Props`와 `SlotProps`, cursor/edit state, projection, query, view, source, command, controller, error, resolver, status, controlled-state handler와 options type을 같은 subpath에서 제공합니다.
