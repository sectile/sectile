<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 계층 격자

계층형 리소스를 정리하고 편집하면서 2차원 격자 이동을 유지합니다.

## 용법

### 행 펼치기

하위 응용 프로그램과 기능이 부모 리소스에 어떻게 연결되는지 프로젝트 목록에서 확인합니다.

<ComponentExample component="tree-grid" scenario="expanded" title="행 펼치기" description="하위 응용 프로그램과 기능이 부모 리소스에 어떻게 연결되는지 프로젝트 목록에서 확인합니다." :index="0" />

### 셀 편집

행과 열의 키보드 이동을 유지하면서 하위 리소스 담당자를 편집합니다.

<ComponentExample component="tree-grid" scenario="editable" title="셀 편집" description="행과 열의 키보드 이동을 유지하면서 하위 리소스 담당자를 편집합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="tree-grid" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/tree-grid`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeGridRoot</code></li>
  <li><code class="component-api-token">TreeGridRow</code></li>
  <li><code class="component-api-token">TreeGridCell</code></li>
  <li><code class="component-api-token">TreeGridDisclosure</code></li>
  <li><code class="component-api-token">TreeGridEditor</code></li>
</ul>
</div>

### Props

#### `TreeGridRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `rows` | `readonly TreeGridRowInput<string, string>[]` | 필수 | 컴포넌트가 관리할 2차원 항목 구조입니다. |
| `modelValue` | `string \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `highlightedValue` | `string \| null` | `undefined` | 키보드 조작 대상으로 강조된 현재 값입니다. |
| `defaultHighlightedValue` | `string \| null` | `null` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `expandedValue` | `readonly string[]` | `undefined` | 하위 항목을 표시할 외부 제어 값입니다. |
| `defaultExpandedValue` | `readonly string[]` | `[]` | 컴포넌트가 관리하는 처음 펼친 값입니다. |
| `editMode` | `TreeGridEditMode` | `undefined` | 외부에서 제어하는 편집 상태입니다. |
| `defaultEditMode` | `TreeGridEditMode` | `'navigation'` | 컴포넌트가 관리하는 초기 편집 상태입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `policies` | `TreeGridPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `getCellValue` | `(id: string) => string` | 필수 | 격자 셀이 나타내는 편집값을 읽는 함수입니다. |
| `setCellValue` | `(id: string, value: string) => void` | 필수 | 격자 셀의 새 편집값을 확정하는 함수입니다. |

#### `TreeGridPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `TreeGridRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string \| null` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `expandedValue` | `readonly string[]` | 하위 항목을 표시 중인 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `editMode` | `TreeGridEditMode` | 현재 편집 상태입니다. |

#### `TreeGridRowSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `expandedValue` | `readonly string[]` | 하위 항목을 표시 중인 값입니다. |
| `expanded` | `boolean` | 하위 항목이 보이는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `editMode` | `TreeGridEditMode` | 현재 편집 상태입니다. |

#### `TreeGridCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `expandedValue` | `readonly string[]` | 하위 항목을 표시 중인 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `editing` | `boolean` | 현재 편집 중인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `editMode` | `TreeGridEditMode` | 현재 편집 상태입니다. |

### 이벤트

#### `TreeGridRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:highlightedValue` | `string \| null` | 새 강조 값을 요청할 때 발생합니다. |
| `update:expandedValue` | `readonly string[]` | 새 펼침 값을 요청할 때 발생합니다. |
| `update:editMode` | `TreeGridEditMode` | 새 편집 상태를 요청할 때 발생합니다. |

### 기타 타입

#### `TreeGridCellValueResolver`

```ts
type TreeGridCellValueResolver = NonNullable<TreeGridRootProps['getCellValue']>
```

#### `TreeGridCellValueSetter`

```ts
type TreeGridCellValueSetter = NonNullable<TreeGridRootProps['setCellValue']>
```

#### `TreeGridValueChangeHandler`

```ts
type TreeGridValueChangeHandler = (value: string | null) => void
```

#### `TreeGridExpandedValueChangeHandler`

```ts
type TreeGridExpandedValueChangeHandler = (value: readonly string[]) => void
```

#### `TreeGridHighlightedValueChangeHandler`

```ts
type TreeGridHighlightedValueChangeHandler = (value: string | null) => void
```

#### `TreeGridEditModeChangeHandler`

```ts
type TreeGridEditModeChangeHandler = (value: TreeGridEditMode) => void
```

#### `TreeGridEditMode`

```ts
type TreeGridEditMode = 'navigation' | 'editing'
```

#### `TreeGridPolicies`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `eligible` | `(id: CellID) => boolean` | — |
| `boundary` | `AxisBoundaryPolicy` | — |
| `maxScan` | `number` | — |

#### `TreeGridRowInput`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `RowID` | 필수 |
| `parentID` | `RowID \| null` | 필수 |
| `cells` | `readonly (CellID \| null)[]` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tree-grid"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">row</code></td>
  <td><code>[data-part="row"]</code></td>
  <td>같은 그리드 행에 속한 셀을 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">disclosure</code></td>
  <td><code>[data-part="disclosure"]</code></td>
  <td>하위 콘텐츠를 펼치거나 접습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">editor</code></td>
  <td><code>[data-part="editor"]</code></td>
  <td>활성 그리드 또는 트리 그리드 셀을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 격자 칸 사이를 이동합니다. |
| <kbd>Space</kbd> | 현재 칸이나 행을 선택합니다. |
| <kbd>Enter</kbd> / <kbd>F2</kbd> | 현재 칸이 편집을 지원하면 편집 모드로 들어갑니다. |
| <kbd>Escape</kbd> | 현재 편집을 취소합니다. |

## 접근성

이름이 있는 격자 안에서 행과 칸이 계층·위치·펼침·선택·편집 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/treegrid/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
