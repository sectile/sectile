<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 태그 입력

하나의 입력 필드에서 자유 형식 태그를 만들고 이동하고 지웁니다.

## 용법

### 기술 태그

입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다.

<ComponentExample component="tags-input" scenario="skills" title="기술 태그" description="입력 포커스를 잃지 않고 기술 태그를 만들거나 지웁니다." :index="0" />

### 개수 제한

기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다.

<ComponentExample component="tags-input" scenario="limited" title="개수 제한" description="기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="tags-input" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/tags-input`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TagsInputRoot</code></li>
  <li><code class="component-api-token">TagsInputItem</code></li>
  <li><code class="component-api-token">TagsInputItemText</code></li>
  <li><code class="component-api-token">TagsInputItemDelete</code></li>
  <li><code class="component-api-token">TagsInputInput</code></li>
  <li><code class="component-api-token">TagsInputClear</code></li>
</ul>
</div>

### Props

#### `TagsInputRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `readonly string[]` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `readonly string[]` | `[]` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `inputValue` | `string` | `undefined` | 편집 입력에 표시할 외부 제어 문자열입니다. |
| `defaultInputValue` | `string` | `''` | 편집 입력에 처음 표시할 내부 관리 문자열입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `'Tags'` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `TagsInputPolicies` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TagsInputItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `index` | `number` | 필수 | 부모 컬렉션 안에서 이 파트의 0부터 시작하는 위치입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TagsInputPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `TagsInputRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `readonly string[]` | 이 계약이 노출하는 현재 값입니다. |
| `inputValue` | `string` | 현재 편집 입력 문자열입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

#### `TagsInputItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `index` | `number` | 부모 컬렉션 안의 0부터 시작하는 위치입니다. |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

### 이벤트

#### `TagsInputRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `readonly string[]` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:inputValue` | `string` | 편집 입력 문자열이 바뀔 때 발생합니다. |

### 기타 타입

#### `TagsInputValueChangeHandler`

```ts
type TagsInputValueChangeHandler = (value: readonly string[]) => void
```

#### `TagsInputInputValueChangeHandler`

```ts
type TagsInputInputValueChangeHandler = (value: string) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tags-input"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-text</code></td>
  <td><code>[data-part="item-text"]</code></td>
  <td>항목 레이블을 조작부와 분리해 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-delete</code></td>
  <td><code>[data-part="item-delete"]</code></td>
  <td>해당 항목을 제거합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">clear</code></td>
  <td><code>[data-part="clear"]</code></td>
  <td>현재 값이나 항목 모음을 비웁니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Comma</kbd> | 현재 입력을 태그로 확정합니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 입력란과 기존 태그 사이를 이동합니다. |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | 커서 상태에 따라 현재 태그로 이동하거나 삭제합니다. |

## 접근성

이름이 있는 묶음이 텍스트 입력을 기본 요소로 유지하고 각 태그 삭제 작업에 이름을 제공합니다.
