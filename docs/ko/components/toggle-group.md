<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토글 버튼 묶음

포커스가 이어지는 묶음에서 하나 또는 여러 작업의 눌림 상태를 관리합니다.

## 용법

### 하나만 선택

한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다.

<ComponentExample component="toggle-group" scenario="single" title="하나만 선택" description="한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다." :index="0" />

### 여러 항목 선택

기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다.

<ComponentExample component="toggle-group" scenario="multiple" title="여러 항목 선택" description="기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="toggle-group" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/toggle-group`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToggleGroupRoot</code></li>
  <li><code class="component-api-token">ToggleGroupItem</code></li>
</ul>
</div>

### Props

#### `ToggleGroupRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `modelValue` | `readonly string[]` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `readonly string[]` | `[]` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 배치와 키보드 이동에 사용할 축입니다. |
| `multiple` | `boolean` | `false` | 여러 값을 동시에 선택할 수 있는지 여부입니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `deselectable` | `boolean` | `true` | 현재 항목을 다시 선택해 값을 지울 수 있는지 여부입니다. |

#### `ToggleGroupItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `ToggleGroupRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `readonly string[]` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

#### `ToggleGroupItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `pressed` | `boolean` | 토글이 눌린 상태인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

### 이벤트

#### `ToggleGroupRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `readonly string[]` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `highlight` | `string \| null` | 강조된 항목이 바뀔 때 발생합니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="toggle-group"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

이름이 있는 묶음이 각 항목을 눌림 버튼으로 노출하고 하나의 이동 탭 위치를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/button/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
