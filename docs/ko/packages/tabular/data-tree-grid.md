<script setup>
import TabularDataTreeGridDemo from '../../../.vitepress/theme/components/TabularDataTreeGridDemo.vue'
</script>

# DataTreeGrid

DataTreeGrid는 grid cursor·editor와 정렬된 계층을 결합합니다. 부모 context가 interactive surface 안에 남아야 하는 서비스 소유권, 파일형 재고, 그룹 권한, 계획 구조에 사용합니다.

<TabularDataTreeGridDemo />

두 group을 펼치고 접고, keyboard로 cell 사이를 이동하고, leaf row를 선택하고, 서비스를 편집해 보세요. group을 접으면 제거된 branch 안에 있던 cursor와 edit state도 안전하게 복구합니다.

::: details 동작하는 전체 예제 source
<<< ../../../.vitepress/theme/components/TabularDataTreeGridDemo.vue
:::

## 계층형 view

source는 group row 바로 뒤에 보이는 descendant를 순서대로 반환합니다. group에는 `parentGroupID`, `depth`, `expanded`가 있고 leaf의 ancestry는 보이는 순서 context로 결정합니다. 잘못된 ancestry는 상태를 일부 변경하지 않고 거부됩니다.

```ts
const rows = [
  {
    kind: 'group', id: 'platform', parentGroupID: null,
    depth: 0, expanded: true,
    cells: { name: 'Platform', owner: '2 services' },
  },
  { kind: 'leaf', id: 'checkout', cells: { name: 'Checkout', owner: 'Alex' } },
  { kind: 'leaf', id: 'storefront', cells: { name: 'Storefront', owner: 'Mina' } },
]
```

## disclosure와 source 연결

`DataTreeGridRowDisclosure`는 expansion을 변경하고 revision이 붙은 source request를 만듭니다. resolver는 현재 보이는 branch와 이를 설명하는 데 필요한 context-only ancestor만 반환할 수 있습니다. Body가 현재 group row를 제공하므로 disclosure는 row ID를 자동으로 상속합니다.

```vue
<DataTreeGridRowDisclosure v-if="row.kind === 'group'">
  {{ row.cells.name }} 전환
</DataTreeGridRowDisclosure>
```

## grid 이동과 편집

leaf cell은 DataGrid와 같은 이동·편집 수명 주기를 사용하며 group cell은 read-only입니다. Enter로 editor를 시작하고 Escape로 취소하며 valid commit은 응용 프로그램 command로 전달됩니다. collapse나 removal은 영향을 받은 editor를 먼저 취소하고 cursor를 보이는 cell로 복구합니다.

`DataTreeGridBody`는 accepted hierarchy를 순서대로 렌더링하고 type이 지정된 `{ row, rowIndex, isGroup }`를 노출합니다. cell, disclosure, selection control, editor는 현재 행 ID를 자동으로 상속합니다. 별도 windowing이 배치를 소유할 때만 manual Body와 명시적인 Row를 사용합니다. Header row 깊이는 header schema에서 계산합니다.

## branch를 가로지르는 선택

보이는 leaf는 `DataTreeGridRowSelectionControl`로 선택합니다. `DataTreeGridBulkSelectionControl`에는 `{ kind: 'all-matching' }` 또는 `{ kind: 'group-leaves', groupID }`를 전달할 수 있습니다. group leaf 선택은 아직 불러오지 않은 descendant도 source나 응용 프로그램이 포함할 수 있도록 intent를 보냅니다.

## metadata와 가상화

projection은 ARIA treegrid 속성에 필요한 parent row, depth, position, size, expansion, context-only metadata를 제공합니다. 열 순서·pinning·크기·filter·sort는 평면 grid 계약을 공유합니다. 가상화는 별도 raw composition이며 Tabular가 측정을 소유하지 않은 채 row나 cell reveal만 연결합니다.

## 공개 Vue API

- 생성: `useDataTreeGrid`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`
- context: `DataTreeGridProvider`, `DataTreeGridRoot`
- 구조: `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- 조작: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor`

모든 part의 `Props`와 `SlotProps`, expansion, cursor/edit state, projection, row metadata, query, view, source, command, controller, error, resolver, status, controlled-state handler와 options type을 같은 subpath에서 제공합니다.
