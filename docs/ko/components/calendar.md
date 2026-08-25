<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 달력

날짜 격자를 이동하고 사용할 수 없는 날을 건너뛰어 날짜를 고릅니다.

## 용법

### 월간 달력

완전한 한 달 격자에서 날짜를 이동하고 선택합니다.

<ComponentExample component="calendar" scenario="month" title="월간 달력" description="완전한 한 달 격자에서 날짜를 이동하고 선택합니다." :index="0" />

### 주간 달력

선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다.

<ComponentExample component="calendar" scenario="week" title="주간 달력" description="선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다." :index="1" />

### 주말 선택 제한

주말 날짜는 보여 주되 선택할 수 없게 합니다.

<ComponentExample component="calendar" scenario="disabled-weekends" title="주말 선택 제한" description="주말 날짜는 보여 주되 선택할 수 없게 합니다." :index="2" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="calendar" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/calendar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CalendarRoot</code></li>
  <li><code class="component-api-token">CalendarCell</code></li>
</ul>
</div>

### Props

#### `CalendarRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `rows` | `readonly (readonly string[])[]` | 필수 | 컴포넌트가 관리할 2차원 항목 구조입니다. |
| `modelValue` | `string \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `highlightedValue` | `string \| null` | `undefined` | 키보드 조작 대상으로 강조된 현재 값입니다. |
| `defaultHighlightedValue` | `string \| null` | `null` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `disabledValues` | `readonly string[]` | `[]` | 화면에는 표시하지만 선택할 수 없게 할 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `CalendarPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CalendarCellProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `CalendarRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string \| null` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `rows` | `readonly (readonly string[])[]` | 현재 보기에 표시할 행입니다. |

#### `CalendarCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `columnIndex` | `number` | 0부터 시작하는 열 위치입니다. |
| `rowIndex` | `number` | 0부터 시작하는 행 위치입니다. |

### 이벤트

#### `CalendarRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:highlightedValue` | `string \| null` | 새 강조 값을 요청할 때 발생합니다. |
| `page` | `{ direction: -1 \| 1; from: string \| null; }` | 요청한 페이지가 바뀔 때 발생합니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="calendar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 하루 전 또는 다음 날로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 일주일 전 또는 다음 주로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 강조된 날짜를 선택합니다. |

## 접근성

루트는 이름이 있는 격자이며 각 칸은 행·열·선택·강조·비활성 상태를 노출합니다.
