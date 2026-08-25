<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 시간 범위 입력

간격과 순서 규칙을 지키며 시작·종료 시각을 편집합니다.

## 용법

### 업무 시간

일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다.

<ComponentExample component="time-range-field" scenario="office-hours" title="업무 시간" description="일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다." :index="0" />

### 일정 간격

설정한 간격에 맞는 값만 입력하고 조절합니다.

<ComponentExample component="time-range-field" scenario="stepped" title="일정 간격" description="설정한 간격에 맞는 값만 입력하고 조절합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="time-range-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/time-range-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimeRangeFieldRoot</code></li>
  <li><code class="component-api-token">TimeRangeFieldStartInput</code></li>
  <li><code class="component-api-token">TimeRangeFieldEndInput</code></li>
</ul>
</div>

### Props

#### `TimeRangeFieldRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `TimeRange \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `TimeRange \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `startLabel` | `string` | `undefined` | 범위 시작 입력의 접근 가능한 이름입니다. |
| `endLabel` | `string` | `undefined` | 범위 종료 입력의 접근 가능한 이름입니다. |
| `policies` | `TimeRangeFieldPolicies` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `TimeRangeFieldRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `TimeRange \| null` | 이 계약이 노출하는 현재 값입니다. |
| `active` | `'start' \| 'end'` | 현재 활성 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `endText` | `string` | 범위 종료 값을 표시한 문자열입니다. |
| `startText` | `string` | 범위 시작값을 표시한 문자열입니다. |

### 이벤트

#### `TimeRangeFieldRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `TimeRange \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

### 기타 타입

#### `TimeRange`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `start` | `TimeValue` | 필수 |
| `end` | `TimeValue` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="time-range-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">start-input</code></td>
  <td><code>[data-part="start-input"]</code></td>
  <td>시작 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-input</code></td>
  <td><code>[data-part="end-input"]</code></td>
  <td>종료 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 값 구간을 증가시키거나 감소시킵니다. |
| <kbd>Enter</kbd> | 입력 중인 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 값을 복원합니다. |

## 접근성

시작과 종료 입력에 각각 이름을 제공하고 양 끝의 오류가 보이는 하나의 순서 있는 시간 범위로 노출합니다.
