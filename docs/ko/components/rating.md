<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 평점

순서가 있는 평점 척도에서 점수를 고치거나 지웁니다.

## 용법

### 5점 별점

5점 척도에서 점수를 고르고 다시 지울 수 있습니다.

<ComponentExample component="rating" scenario="five-star" title="5점 별점" description="5점 척도에서 점수를 고르고 다시 지울 수 있습니다." :index="0" />

### 필수 선택

항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다.

<ComponentExample component="rating" scenario="required" title="필수 선택" description="항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="rating" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/rating`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RatingRoot</code></li>
  <li><code class="component-api-token">RatingItem</code></li>
  <li><code class="component-api-token">RatingIndicator</code></li>
  <li><code class="component-api-token">RatingClear</code></li>
</ul>
</div>

### Props

#### `RatingRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `modelValue` | `string` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string` | `''` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `clearable` | `boolean` | `false` | 현재 선택을 지울 수 있는지 여부입니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `RatingClearProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `RatingRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `clearable` | `boolean` | 현재 값을 지울 수 있는지 여부입니다. |

### 이벤트

#### `RatingRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="rating"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
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
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

평점 선택은 라디오 묶음 의미를 사용하고 각 점수에 이름을 제공하며 명시적인 지우기 작업을 제공합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
