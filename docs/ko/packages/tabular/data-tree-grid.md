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

## Tabular core만 사용

renderer-neutral controller는 계층 검증, expansion revision, cursor와 editor 복구를 계산합니다. application은 request에 맞는 ordered hierarchy를 응답으로 동기화합니다.

```ts
import { createDataTreeGrid } from '@sectile/tabular/data-tree-grid'

const columns = [
  { id: 'service', capabilities: ['sort', 'filter', 'edit'] },
  { id: 'owner', capabilities: ['sort', 'filter'] },
] as const
const tree = createDataTreeGrid({ columns })

tree.attachRequestExecutor(({ request }) => {
  const expanded = request.expansion.includes('commerce')
  tree.synchronizeView({
    protocolVersion: 1,
    requestID: request.requestID,
    sourceGeneration: request.sourceGeneration,
    queryRevision: request.queryRevision,
    expansionRevision: request.expansionRevision,
    viewRevision: request.requestID,
    access: request.access,
    matchingLeafCount: { kind: 'known', value: 1 },
    visibleRowCount: { kind: 'known', value: expanded ? 2 : 1 },
    rows: [
      { kind: 'group', id: 'commerce', parentGroupID: null, depth: 0, expanded, cells: { service: 'Commerce', owner: '' } },
      ...(expanded ? [{ kind: 'leaf' as const, id: 'checkout', cells: { service: 'Checkout', owner: 'Alex' } }] : []),
    ],
    columnSchema: { revision: request.columnSchemaRevision, columns, headers: [] },
    removedRowIDs: [],
  })
})

tree.dispatch({ type: 'set-expansion', expansion: ['commerce'] })
renderTreeGrid(tree.getProjection())
```

## DOM에 직접 연결

DOM connection은 같은 projection을 ARIA treegrid metadata, disclosure, keyboard 이동과 편집 element에 연결합니다.

`RowSelectionControl`의 Shift 범위는 현재 보이는 leaf 행에만 적용되므로 group 행과 접힌 descendant는 checkbox 범위에 들어가지 않습니다.

```ts
import { createDataTreeGrid } from '@sectile/dom/tabular'

const connection = createDataTreeGrid({
  columns,
  root: document.querySelector<HTMLElement>('#service-tree-grid')!,
  onCommand: handleTreeGridCommand,
  onSnapshotChange: renderTreeGrid,
})

const serviceHeader = document.querySelector<HTMLElement>('[data-header="service"]')!
const groupRow = document.querySelector<HTMLElement>('[data-row="commerce"]')!
const disclosureButton = groupRow.querySelector<HTMLButtonElement>('button')!
const leafRow = document.querySelector<HTMLElement>('[data-row="checkout"]')!
const ownerCell = leafRow.querySelector<HTMLElement>('[data-column="owner"]')!
connection.setColumnHeaderAttributes(serviceHeader, { columnID: 'service' })
const releaseGroup = connection.registerRow(groupRow, { rowID: 'commerce' })
const releaseDisclosure = connection.bindRowDisclosure(disclosureButton, {
  rowID: 'commerce',
})
const releaseLeaf = connection.registerRow(leafRow, { rowID: 'checkout' })
const releaseCell = connection.registerCell(ownerCell, {
  cell: { rowID: 'checkout', columnID: 'owner' },
})
```

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

`const DataTreeGrid = createDataTreeGridComponents(tree)`로 type이 결합된 namespace를 한 번 만듭니다. `DataTreeGrid.RowDisclosure`는 expansion을 변경하고 revision이 붙은 source request를 만듭니다. resolver는 현재 보이는 branch와 이를 설명하는 데 필요한 context-only ancestor만 반환할 수 있습니다. Body가 현재 group row를 제공하므로 disclosure는 row ID를 자동으로 상속합니다.

```vue
<DataTreeGrid.RowDisclosure v-if="row.kind === 'group'">
  {{ row.cells.name }} 전환
</DataTreeGrid.RowDisclosure>
```

group을 펼치거나 접으면 `expansionRevision`이 증가하고 `request.expansion`에 현재 펼쳐진 group ID가 들어갑니다. server는 요청된 branch의 visible descendants를 반환합니다.

expansion, cursor, edit state를 외부 store가 소유해야 하면 각각 controlled ref와 change callback을 전달합니다.

```ts
const expansion = ref<readonly string[]>(['platform'])

const tree = useDataTreeGrid({
  columns,
  expansion,
  onExpansionChange: (next) => { expansion.value = next },
  defaultCursor: { current: null },
  defaultEditState: { kind: 'navigation' },
})
```

## grid 이동과 편집

leaf cell은 DataGrid와 같은 이동·편집 수명 주기를 사용하며 group cell은 read-only입니다. Enter로 editor를 시작하고 Escape로 취소하며 valid commit은 응용 프로그램 command로 전달됩니다. collapse나 removal은 영향을 받은 editor를 먼저 취소하고 cursor를 보이는 cell로 복구합니다.

`DataTreeGrid.Body`는 accepted hierarchy를 순서대로 렌더링하고 type이 지정된 `{ row, rowIndex, isGroup }`를 노출합니다. cell, disclosure, selection control, editor는 현재 행 ID를 자동으로 상속합니다. 별도 windowing이 배치를 소유할 때만 manual Body와 명시적인 Row를 사용합니다. Header row 깊이는 header schema에서 계산합니다.

## branch를 가로지르는 선택

보이는 leaf는 `DataTreeGrid.RowSelectionControl`로 선택합니다. `DataTreeGrid.BulkSelectionControl`에는 `{ kind: 'all-matching' }` 또는 `{ kind: 'group-leaves', groupID }`를 전달할 수 있습니다. group leaf 선택은 아직 불러오지 않은 descendant도 source나 응용 프로그램이 포함할 수 있도록 intent를 보냅니다.

```vue
<DataTreeGrid.RowSelectionControl
  v-if="row.kind === 'leaf'"
  name="selected-services"
/>
<DataTreeGrid.BulkSelectionControl
  v-if="row.kind === 'group'"
  :target="{ kind: 'group-leaves', groupID: row.id }"
>
  {{ row.cells.name }} 전체 선택
</DataTreeGrid.BulkSelectionControl>
```

`group-leaves`는 controller가 임의로 descendant ID를 추측하지 않고 `request-bulk-selection` command로 application/source에 정확한 intent를 전달합니다.

## 정렬, 필터와 context-only ancestor

sort와 filter는 leaf 결과에 적용되지만 treegrid가 parent context를 잃어서는 안 됩니다. source는 matching leaf로 이어지는 ancestor를 `contextOnly: true`로 포함할 수 있습니다. context-only row는 구조와 ARIA metadata를 유지하기 위한 행이며 선택·편집 대상이 아닙니다.

```ts
const rows = [
  {
    kind: 'group', id: 'platform', parentGroupID: null,
    depth: 0, expanded: true, contextOnly: true,
    cells: { name: 'Platform', owner: '' },
  },
  {
    kind: 'leaf', id: 'checkout',
    cells: { name: 'Checkout', owner: 'Alex' },
  },
]
```

다중 정렬, column/global filter, page/window access, source 취소와 stale response 처리는 다른 profile과 같습니다. 계층 응답은 parent-before-child 순서, depth, expansion, ancestry가 모두 유효할 때만 수락됩니다.

## metadata와 가상화

projection은 ARIA treegrid 속성에 필요한 parent row, depth, position, size, expansion, context-only metadata를 제공합니다. 열 순서·pinning·크기·filter·sort는 평면 grid 계약을 공유합니다. 가상화는 별도 raw composition이며 Tabular가 측정을 소유하지 않은 채 row나 cell reveal만 연결합니다.

## part별 용도

| Part | 용도 |
| --- | --- |
| `Provider` · `Root` | controller inject, ARIA treegrid와 command/error boundary |
| `Header` · `HeaderRow` · `ColumnHeader` | header schema와 column metadata |
| `SortTrigger` · `FilterControl` | canonical query 변경과 새 계층 view request |
| `Body` · `Row` · `Cell` | group/leaf 순서, row level과 cell cursor 등록 |
| `RowDisclosure` | expansion 변경과 branch request |
| `RowSelectionControl` · `BulkSelectionControl` | leaf, all-matching, group-leaves 선택 |
| `ColumnResizeHandle` | host column size 변경 |
| `Editor` | leaf cell만 navigation/edit mode에 연결 |

## 계층별 공개 API

- Tabular core: `createDataTreeGrid`, `tryCreateDataTreeGrid`, controller의 view/source API와 `dispatch`, expansion/cursor/edit projection
- DOM: `createDataTreeGrid`, `connectDataTreeGrid`, header/row/cell 속성과 등록, sort/filter/selection/disclosure/editor/resize binding, cell/row reveal
- Vue 생성: `useDataTreeGrid`, `createDataTreeGridComponents`, `useDataTreeGridSource`, `useDataTreeGridContext`, `defineDataTreeGridColumns`
- Vue 구조: `Provider`, `Root`, `Header`, `HeaderRow`, `ColumnHeader`, `Body`, `Row`, `Cell`
- Vue 조작: `SortTrigger`, `FilterControl`, `RowSelectionControl`, `BulkSelectionControl`, `RowDisclosure`, `ColumnResizeHandle`, `Editor`

각 계층의 같은 subpath에서 expansion, cursor/edit state, projection, row metadata, query, view, source, command, controller, error와 options type을 제공합니다. Vue는 각 part의 `Props`와 `SlotProps` type을 추가합니다.
