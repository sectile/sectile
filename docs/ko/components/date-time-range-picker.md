<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜·시간 범위 선택기

시작·종료 날짜와 각각의 현지 시각을 선택합니다.

## 용법

### 유지 보수 기간

여러 날에 걸친 유지 보수 기간의 시작·종료 시각을 각각 선택합니다.

<ComponentExample component="date-time-range-picker" scenario="maintenance" title="유지 보수 기간" description="여러 날에 걸친 유지 보수 기간의 시작·종료 시각을 각각 선택합니다." :index="0" />

### 업무 시간

일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다.

<ComponentExample component="date-time-range-picker" scenario="office-hours" title="업무 시간" description="일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="date-time-range-picker" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/date-time-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeRangePickerRoot</code></li>
  <li><code class="component-api-token">DateTimeRangePickerTrigger</code></li>
  <li><code class="component-api-token">DateTimeRangePickerContent</code></li>
  <li><code class="component-api-token">DateTimeRangePickerGrid</code></li>
  <li><code class="component-api-token">DateTimeRangePickerCell</code></li>
  <li><code class="component-api-token">DateTimeRangePickerMonthCell</code></li>
  <li><code class="component-api-token">DateTimeRangePickerStartDateTimeInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerEndDateTimeInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerStartDateInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerEndDateInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerStartTimeInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerEndTimeInput</code></li>
  <li><code class="component-api-token">DateTimeRangePickerPreviousWeek</code></li>
  <li><code class="component-api-token">DateTimeRangePickerNextWeek</code></li>
  <li><code class="component-api-token">DateTimeRangePickerPreviousMonth</code></li>
  <li><code class="component-api-token">DateTimeRangePickerNextMonth</code></li>
  <li><code class="component-api-token">DateTimeRangePickerPreviousYear</code></li>
  <li><code class="component-api-token">DateTimeRangePickerNextYear</code></li>
  <li><code class="component-api-token">DateTimeRangePickerWeekViewTrigger</code></li>
  <li><code class="component-api-token">DateTimeRangePickerMonthViewTrigger</code></li>
  <li><code class="component-api-token">DateTimeRangePickerYearViewTrigger</code></li>
</ul>
</div>

### Props

#### `DateTimeRangePickerRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `DateTimeRange \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `DateTimeRange \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `highlightedValue` | `DateValue` | `undefined` | 키보드 조작 대상으로 강조된 현재 값입니다. |
| `defaultHighlightedValue` | `DateValue` | `undefined` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `DateTimeRangePickerOptions['policies']` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `defaultView` | `PickerRootSlotProps['viewMode']` | `'month'` | 달력 또는 선택기의 초기 보기입니다. |

#### `DateTimeRangePickerPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `DateTimeRangePickerCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `DateValue` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `inRange` | `boolean` | 선택한 범위 안에 있는 값인지 여부입니다. |
| `outsideMonth` | `boolean` | 인접한 달의 날짜인지 여부입니다. |

#### `DateTimeRangePickerMonthCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `DatePickerMonthValue` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `inRange` | `boolean` | 선택한 범위 안에 있는 값인지 여부입니다. |

#### `DateTimeRangePickerRootSlotProps`

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

#### `DateTimeRangePickerRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `PickerValue` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:highlightedValue` | `DateValue` | 새 강조 값을 요청할 때 발생합니다. |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |

### 기타 타입

#### `DateTimeRange`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `start` | `DateTimeValue` | 필수 |
| `end` | `DateTimeValue` | 필수 |

#### `DateValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |
| `day` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="date-time-range-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">start-date-time-input</code></td>
  <td><code>[data-part="start-date-time-input"]</code></td>
  <td>Start Date Time Input 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-date-time-input</code></td>
  <td><code>[data-part="end-date-time-input"]</code></td>
  <td>End Date Time Input 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">start-date-input</code></td>
  <td><code>[data-part="start-date-input"]</code></td>
  <td>Start Date Input 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-date-input</code></td>
  <td><code>[data-part="end-date-input"]</code></td>
  <td>End Date Input 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">start-time-input</code></td>
  <td><code>[data-part="start-time-input"]</code></td>
  <td>Start Time Input 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-time-input</code></td>
  <td><code>[data-part="end-time-input"]</code></td>
  <td>End Time Input 스타일 영역을 노출합니다.</td>
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
  <td><code class="component-part-token">week-view-trigger</code></td>
  <td><code>[data-part="week-view-trigger"]</code></td>
  <td>달력을 주 보기로 전환합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">month-view-trigger</code></td>
  <td><code>[data-part="month-view-trigger"]</code></td>
  <td>달력을 월 보기로 전환합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">year-view-trigger</code></td>
  <td><code>[data-part="year-view-trigger"]</code></td>
  <td>달력을 년 보기로 전환합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous-week</code></td>
  <td><code>[data-part="previous-week"]</code></td>
  <td>이전 주(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-week</code></td>
  <td><code>[data-part="next-week"]</code></td>
  <td>다음 주(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous-month</code></td>
  <td><code>[data-part="previous-month"]</code></td>
  <td>이전 월(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-month</code></td>
  <td><code>[data-part="next-month"]</code></td>
  <td>다음 월(으)로 이동합니다.</td>
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
  <td><code class="component-part-token">month-cell</code></td>
  <td><code>[data-part="month-cell"]</code></td>
  <td>선택할 수 있는 월 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 강조된 날짜를 하루 또는 일주일 단위로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 한 달 단위로 이동하고, Shift와 함께 누르면 일 년 단위로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 날짜를 선택합니다. |
| <kbd>Escape</kbd> | 다른 날짜를 선택하지 않고 달력을 닫습니다. |

## 접근성

두 개의 날짜·시간 필드와 달력 격자가 시작·종료 지점을 명확히 구분합니다.
