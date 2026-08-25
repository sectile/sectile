<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 체크박스

하나의 선택 여부를 바꾸거나 일부만 선택된 부모 상태를 나타냅니다.

## 용법

### 선택 또는 해제

하나의 선택 항목을 선택 또는 해제 상태로 나타냅니다.

<ComponentExample component="checkbox" scenario="binary" title="선택 또는 해제" description="하나의 선택 항목을 선택 또는 해제 상태로 나타냅니다." :index="0" />

### 일부 선택

하위 항목이 일부만 선택된 부모 항목을 나타냅니다.

<ComponentExample component="checkbox" scenario="mixed" title="일부 선택" description="하위 항목이 일부만 선택된 부모 항목을 나타냅니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="checkbox" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/checkbox`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxRoot</code></li>
  <li><code class="component-api-token">CheckboxIndicator</code></li>
</ul>
</div>

### Props

#### `CheckboxRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | `'on'` | 이 계약이 노출하는 현재 값입니다. |
| `modelValue` | `CheckboxValue` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `CheckboxValue` | `false` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CheckboxIndicatorProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'span'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `CheckboxSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `checked` | `CheckboxValue` | 컨트롤이 선택됐는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `isChecked` | `boolean` | 이 체크박스 값이 선택됐는지 여부입니다. |
| `isIndeterminate` | `boolean` | 묶음 값의 일부만 선택됐는지 여부입니다. |

### 이벤트

#### `CheckboxRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `CheckboxValue` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

### 기타 타입

#### `CheckboxValue`

```ts
type CheckboxValue = boolean | 'indeterminate'
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="checkbox"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

루트는 체크박스 의미를 제공하며 일부 선택 값은 `aria-checked="mixed"`로 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
