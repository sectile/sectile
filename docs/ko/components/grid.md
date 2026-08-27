<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Grid

2차원 칸을 이동하고 값을 선택하거나 편집 상태로 들어갑니다.

## 용법

### 선택 가능

격자 사이를 이동하고 현재 칸을 선택합니다.

<ComponentExample component="grid" scenario="selectable" title="선택 가능" description="격자 사이를 이동하고 현재 칸을 선택합니다." :index="0" />

### 비활성 항목 끝에서 처음으로 이동

격자 끝에서도 활성 칸을 따라 이동을 이어 갑니다.

<ComponentExample component="grid" scenario="disabled-wrap" title="비활성 항목 끝에서 처음으로 이동" description="격자 끝에서도 활성 칸을 따라 이동을 이어 갑니다." :index="1" />

### 편집 가능

격자 이동을 유지하면서 현재 칸의 값을 편집합니다.

<ComponentExample component="grid" scenario="editable" title="편집 가능" description="격자 이동을 유지하면서 현재 칸의 값을 편집합니다." :index="2" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="grid" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/grid`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">GridRoot</code></li>
  <li><code class="component-api-token">GridRow</code></li>
  <li><code class="component-api-token">GridCell</code></li>
</ul>
</div>

### Props

#### `GridRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'div'</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultEditMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>GridEditMode</code></span><span><span class="component-api-definition__label">기본값</span><code>'navigation'</code></span></div>
<p>컴포넌트가 관리하는 초기 편집 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultHighlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>null</code></span></div>
<p>컴포넌트가 관리하는 처음 강조 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>null</code></span></div>
<p>컴포넌트가 값을 관리할 때 사용할 초깃값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabledItems</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>포커스와 선택 대상에서 제외할 항목 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>editMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>GridEditMode</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>외부에서 제어하는 편집 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>키보드 조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>GridPolicies&lt;string&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>rows</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (readonly (string | null)[])[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>컴포넌트가 관리할 2차원 항목 구조입니다.</p>
</dd>
</div>
</dl>

#### `GridPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `GridRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>editMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>GridEditMode</code></span></div>
<p>현재 편집 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `GridCellSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>editMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>GridEditMode</code></span></div>
<p>현재 편집 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlighted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>조작 대상으로 강조된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>selected</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 선택된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `GridRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>editCancel</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>편집을 취소하고 기존 값을 유지할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>editCommit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>편집한 셀 값을 확정할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>editStart</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>셀이 편집 상태로 들어갈 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:editMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>GridEditMode</code></span></div>
<p>새 편집 상태를 요청할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>새 강조 값을 요청할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `GridValueChangeHandler`

```ts
type GridValueChangeHandler = (value: string | null) => void
```

#### `GridHighlightedValueChangeHandler`

```ts
type GridHighlightedValueChangeHandler = (value: string | null) => void
```

#### `GridEditModeChangeHandler`

```ts
type GridEditModeChangeHandler = (value: GridEditMode) => void
```

#### `GridEditStartHandler`

```ts
type GridEditStartHandler = (value: string) => void
```

#### `GridEditCommitHandler`

```ts
type GridEditCommitHandler = (value: string) => void
```

#### `GridEditCancelHandler`

```ts
type GridEditCancelHandler = (value: string) => void
```

#### `GridEditMode`

```ts
type GridEditMode = 'navigation' | 'editing'
```

#### `GridPolicies`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `eligible` | `(id: ID) => boolean` | — |
| `boundary` | `AxisBoundaryPolicy` | — |
| `maxScan` | `number` | — |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="grid"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

이름이 있는 격자가 행과 열 수를 전달하고 각 칸은 위치·선택·비활성 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
