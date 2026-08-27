<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Tree View

포커스와 선택을 나눠 유지하면서 펼칠 수 있는 계층을 탐색합니다.

## 용법

### 계층 펼치기

각 폴더의 펼침 상태를 따로 유지하면서 실제 프로젝트 계층을 탐색합니다.

<ComponentExample component="tree-view" scenario="expanded" title="계층 펼치기" description="각 폴더의 펼침 상태를 따로 유지하면서 실제 프로젝트 계층을 탐색합니다." :index="0" />

### 접힌 상태

원본 계층은 유지한 채 하위 항목을 숨겼다가 다시 펼칩니다.

<ComponentExample component="tree-view" scenario="collapsed" title="접힌 상태" description="원본 계층은 유지한 채 하위 항목을 숨겼다가 다시 펼칩니다." :index="1" />

### 여러 항목 선택

폴더 펼침 상태를 유지하면서 검토할 파일 여러 개를 선택합니다.

<ComponentExample component="tree-view" scenario="multiple" title="여러 항목 선택" description="폴더 펼침 상태를 유지하면서 검토할 파일 여러 개를 선택합니다." :index="2" />

### 비활성 항목

비활성화된 항목을 계층에 표시하되 포커스와 선택 대상에서는 제외합니다.

<ComponentExample component="tree-view" scenario="unavailable" title="비활성 항목" description="비활성화된 항목을 계층에 표시하되 포커스와 선택 대상에서는 제외합니다." :index="3" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="tree-view" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="4" />

## API

Vue 패키지: `@sectile/vue/tree-view`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeViewRoot</code></li>
  <li><code class="component-api-token">TreeViewGroup</code></li>
  <li><code class="component-api-token">TreeViewItem</code></li>
  <li><code class="component-api-token">TreeViewDisclosure</code></li>
</ul>
</div>

### Props

#### `TreeViewRootProps`

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
<dt><code>defaultExpandedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>컴포넌트가 관리하는 처음 펼친 값 목록입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
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
<dt><code>expandedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>하위 항목을 표시할 외부 제어 값 목록입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>nodes</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly TreeNodeInput&lt;string&gt;[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>계층을 구성할 평면 노드 목록입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>TreeViewPolicies&lt;string&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
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
<dt><code>selectionMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>TreeViewSelectionMode</code></span><span><span class="component-api-definition__label">기본값</span><code>'single'</code></span></div>
<p>하나 또는 여러 값을 선택할지 정합니다.</p>
</dd>
</div>
</dl>

#### `TreeViewPartProps`

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

#### `TreeViewGroupProps`

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
<dt><code>for</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 컴포넌트가 연결할 관련 파트의 값 또는 ID입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `TreeViewRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>expandedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>하위 항목을 표시 중인 값 목록입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `TreeViewItemSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>expanded</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>하위 항목이 보이는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>expandedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>하위 항목을 표시 중인 값 목록입니다.</p>
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
<dt><code>selectedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>현재 선택된 값입니다.</p>
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

#### `TreeViewRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:expandedValues</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>readonly string[]</code></span></div>
<p>새 펼침 값 목록을 요청할 때 발생합니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>readonly string[]</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `TreeViewPolicies`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `eligible` | `(id: ID) => boolean` | — |

#### `TreeViewEligiblePredicate`

```ts
type TreeViewEligiblePredicate<ID extends string = string> = NonNullable<TreeViewPolicies<ID>['eligible']>
```

#### `TreeViewValueChangeHandler`

```ts
type TreeViewValueChangeHandler = (value: readonly string[]) => void
```

#### `TreeViewExpandedValuesChangeHandler`

```ts
type TreeViewExpandedValuesChangeHandler = (value: readonly string[]) => void
```

#### `TreeViewHighlightedValueChangeHandler`

```ts
type TreeViewHighlightedValueChangeHandler = (value: string | null) => void
```

#### `TreeNodeInput`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `ID` | 필수 |
| `parentID` | `ID \| null` | 필수 |

#### `TreeViewSelectionMode`

```ts
type TreeViewSelectionMode = 'single' | 'multiple'
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tree-view"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">group</code></td>
  <td><code>[data-part="group"]</code></td>
  <td>관련 하위 항목을 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">disclosure</code></td>
  <td><code>[data-part="disclosure"]</code></td>
  <td>하위 콘텐츠를 펼치거나 접습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 보이는 트리 항목 사이를 이동합니다. |
| <kbd>Arrow Right</kbd> | 가지를 펼치거나 첫 번째 자식으로 이동합니다. |
| <kbd>Arrow Left</kbd> | 가지를 접거나 부모로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |

## 접근성

트리 항목이 단계·펼침·선택·비활성 상태를 노출하고 하나의 이동 탭 위치를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
