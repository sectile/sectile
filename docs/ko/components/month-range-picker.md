<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Month Range Picker

한 해의 월 격자에서 양 끝을 포함하는 달 범위를 고릅니다.

## 용법

### reporting period

보고서에 포함할 첫 달과 마지막 달을 고릅니다.

<ComponentExample component="month-range-picker" scenario="reporting-period" title="reporting period" description="보고서에 포함할 첫 달과 마지막 달을 고릅니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="month-range-picker" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="month-range-picker" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/month-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthRangePickerRoot</code></li>
  <li><code class="component-api-token">MonthRangePickerTrigger</code></li>
  <li><code class="component-api-token">MonthRangePickerContent</code></li>
  <li><code class="component-api-token">MonthRangePickerGrid</code></li>
  <li><code class="component-api-token">MonthRangePickerCell</code></li>
  <li><code class="component-api-token">MonthRangePickerStartInput</code></li>
  <li><code class="component-api-token">MonthRangePickerEndInput</code></li>
  <li><code class="component-api-token">MonthRangePickerPreviousYear</code></li>
  <li><code class="component-api-token">MonthRangePickerNextYear</code></li>
</ul>
</div>

### Props

#### `MonthRangePickerRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `DateRange \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `DateRange \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `highlightedValue` | `DateValue` | `undefined` | 키보드 조작 대상으로 강조된 현재 값입니다. |
| `defaultHighlightedValue` | `DateValue` | `undefined` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `DateRangePickerOptions['policies']` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |

#### `MonthRangePickerPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `MonthRangePickerCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `DatePickerMonthValue` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `inRange` | `boolean` | 선택한 범위 안에 있는 값인지 여부입니다. |

#### `MonthRangePickerRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `PickerValue` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `DateValue` | 조작 대상으로 강조된 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `view` | `{ readonly year: number; readonly month: number }` | 현재 달력 기준점입니다. |
| `viewMode` | `DatePickerViewMode` | 현재 달력 보기 방식입니다. |
| `dates` | `readonly (readonly DateValue[])[]` | 현재 보기에 표시할 날짜입니다. |
| `months` | `readonly (readonly DatePickerMonthValue[])[]` | 현재 보기에 표시할 달입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `years` | `readonly (readonly PickerYearValue[])[]` | 현재 보기에 표시할 연도입니다. |

### 이벤트

#### `MonthRangePickerRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `PickerValue` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:highlightedValue` | `DateValue` | 새 강조 값을 요청할 때 발생합니다. |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |

### 기타 타입

#### `MonthRangePickerValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `start` | `DateValue` | 필수 |
| `end` | `DateValue` | 필수 |

#### `MonthPickerValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |
| `day` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="month-range-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
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
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">grid</code></td>
  <td><code>[data-part="grid"]</code></td>
  <td>셀을 탐색 가능한 2차원 구조로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous-year</code></td>
  <td><code>[data-part="previous-year"]</code></td>
  <td>이전 년(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-year</code></td>
  <td><code>[data-part="next-year"]</code></td>
  <td>다음 년(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 연도 격자에서 달 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 달을 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 월 격자를 닫습니다. |

## 접근성

시작·종료 월 입력이 하나의 연도 격자를 공유하면서 양 끝의 이름을 독립적으로 유지합니다.
