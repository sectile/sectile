<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 단계별 선택

계층을 열 단위로 좁혀 가며 마지막 값을 선택합니다.

## 용법

### 지역

국가에서 도시까지 위치를 단계별로 선택합니다.

<ComponentExample component="cascade-select" scenario="location" title="지역" description="국가에서 도시까지 위치를 단계별로 선택합니다." :index="0" />

### 비활성 항목

키보드와 포인터 입력을 받지 않습니다.

<ComponentExample component="cascade-select" scenario="disabled" title="비활성 항목" description="키보드와 포인터 입력을 받지 않습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="cascade-select" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/cascade-select`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CascadeSelectRoot</code></li>
  <li><code class="component-api-token">CascadeSelectTrigger</code></li>
  <li><code class="component-api-token">CascadeSelectValue</code></li>
  <li><code class="component-api-token">CascadeSelectContent</code></li>
  <li><code class="component-api-token">CascadeSelectColumn</code></li>
  <li><code class="component-api-token">CascadeSelectItem</code></li>
  <li><code class="component-api-token">CascadeSelectItemIndicator</code></li>
  <li><code class="component-api-token">CascadeSelectItemChevron</code></li>
</ul>
</div>

### Props

#### `CascadeSelectRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `nodes` | `readonly CascadeSelectItemDefinition<string>[]` | 필수 | 계층을 구성할 평면 노드 목록입니다. |
| `modelValue` | `string \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `CascadeSelectPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `textValue` | `(id: string) => string` | `undefined` | 항목 값을 검색 또는 표시 문자열로 바꾸는 함수입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CascadeSelectColumnProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `depth` | `number` | 필수 | 단계별 선택에서 이 열의 0부터 시작하는 깊이입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CascadeSelectItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CascadeSelectPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `CascadeSelectRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string \| null` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `columns` | `readonly (readonly string[])[]` | 현재 표시 중인 단계별 선택 열입니다. |
| `path` | `readonly string[]` | 현재 선택 경로입니다. |
| `valuePath` | `readonly string[]` | 루트부터 마지막 항목까지의 현재 선택값입니다. |

#### `CascadeSelectColumnSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `items` | `readonly string[]` | 현재 계산된 항목 컬렉션입니다. |
| `depth` | `number` | 현재 계층 항목의 깊이입니다. |
| `parentValue` | `string \| null` | 현재 단계별 선택 열을 소유한 값입니다. |

#### `CascadeSelectItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `expanded` | `boolean` | 하위 항목이 보이는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `branch` | `boolean` | 이 항목이 하위 항목을 소유하는지 여부입니다. |

### 이벤트

#### `CascadeSelectRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |
| `highlight` | `string \| null` | 강조된 항목이 바뀔 때 발생합니다. |

### 기타 타입

#### `CascadeSelectTextValueResolver`

```ts
type CascadeSelectTextValueResolver = NonNullable<CascadeSelectRootProps['textValue']>
```

#### `CascadeSelectValueChangeHandler`

```ts
type CascadeSelectValueChangeHandler = (value: string | null) => void
```

#### `CascadeSelectOpenChangeHandler`

```ts
type CascadeSelectOpenChangeHandler = (value: boolean) => void
```

#### `CascadeSelectHighlightHandler`

```ts
type CascadeSelectHighlightHandler = (value: string | null) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="cascade-select"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">value</code></td>
  <td><code>[data-part="value"]</code></td>
  <td>현재 확정 값을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">column</code></td>
  <td><code>[data-part="column"]</code></td>
  <td>계층형 선택 항목의 한 단계를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-chevron</code></td>
  <td><code>[data-part="item-chevron"]</code></td>
  <td>항목에 하위 단계가 있음을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

각 열은 이름이 있는 목록 상자이며 항목은 선택·하위 가지·비활성 상태를 노출합니다.
