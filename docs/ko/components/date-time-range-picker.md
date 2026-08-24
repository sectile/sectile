<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜·시간 범위 선택기

시작·종료 날짜와 각각의 현지 시각을 선택합니다.

## 예시

### 유지 보수 기간

여러 날에 걸친 유지 보수 기간의 시작·종료 시각을 각각 선택합니다.

<ComponentExample component="date-time-range-picker" scenario="maintenance" title="유지 보수 기간" description="여러 날에 걸친 유지 보수 기간의 시작·종료 시각을 각각 선택합니다." :index="0" />

### 업무 시간

일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다.

<ComponentExample component="date-time-range-picker" scenario="office-hours" title="업무 시간" description="일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-time-range-picker" />

## 공개 API

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

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeRangePickerRootProps</code></li>
  <li><code class="component-api-token">DateTimeRange</code></li>
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">DateTimeRangePickerCellSlotProps</code></li>
  <li><code class="component-api-token">DateTimeRangePickerMonthCellSlotProps</code></li>
  <li><code class="component-api-token">DateTimeRangePickerPartProps</code></li>
  <li><code class="component-api-token">DateTimeRangePickerRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-time-range-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">start-date-time-input</code></li>
  <li><code class="component-part-token">end-date-time-input</code></li>
  <li><code class="component-part-token">start-date-input</code></li>
  <li><code class="component-part-token">end-date-input</code></li>
  <li><code class="component-part-token">start-time-input</code></li>
  <li><code class="component-part-token">end-time-input</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">week-view-trigger</code></li>
  <li><code class="component-part-token">month-view-trigger</code></li>
  <li><code class="component-part-token">year-view-trigger</code></li>
  <li><code class="component-part-token">previous-week</code></li>
  <li><code class="component-part-token">next-week</code></li>
  <li><code class="component-part-token">previous-month</code></li>
  <li><code class="component-part-token">next-month</code></li>
  <li><code class="component-part-token">previous-year</code></li>
  <li><code class="component-part-token">next-year</code></li>
  <li><code class="component-part-token">grid</code></li>
  <li><code class="component-part-token">cell</code></li>
  <li><code class="component-part-token">month-cell</code></li>
</ul>

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
