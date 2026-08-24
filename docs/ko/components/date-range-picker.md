<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜 범위 선택기

여러 달을 이동하며 양 끝을 포함하는 날짜 범위를 고릅니다.

## 예시

### 예약

예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다.

<ComponentExample component="date-range-picker" scenario="booking" title="예약" description="예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="date-range-picker" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-range-picker" />

## 공개 API

Vue 패키지: `@sectile/vue/date-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateRangePickerRoot</code></li>
  <li><code class="component-api-token">DateRangePickerTrigger</code></li>
  <li><code class="component-api-token">DateRangePickerContent</code></li>
  <li><code class="component-api-token">DateRangePickerGrid</code></li>
  <li><code class="component-api-token">DateRangePickerCell</code></li>
  <li><code class="component-api-token">DateRangePickerMonthCell</code></li>
  <li><code class="component-api-token">DateRangePickerStartInput</code></li>
  <li><code class="component-api-token">DateRangePickerEndInput</code></li>
  <li><code class="component-api-token">DateRangePickerPreviousWeek</code></li>
  <li><code class="component-api-token">DateRangePickerNextWeek</code></li>
  <li><code class="component-api-token">DateRangePickerPreviousMonth</code></li>
  <li><code class="component-api-token">DateRangePickerNextMonth</code></li>
  <li><code class="component-api-token">DateRangePickerPreviousYear</code></li>
  <li><code class="component-api-token">DateRangePickerNextYear</code></li>
  <li><code class="component-api-token">DateRangePickerWeekViewTrigger</code></li>
  <li><code class="component-api-token">DateRangePickerMonthViewTrigger</code></li>
  <li><code class="component-api-token">DateRangePickerYearViewTrigger</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateRangePickerRootProps</code></li>
  <li><code class="component-api-token">DateRange</code></li>
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">DateRangePickerCellSlotProps</code></li>
  <li><code class="component-api-token">DateRangePickerMonthCellSlotProps</code></li>
  <li><code class="component-api-token">DateRangePickerPartProps</code></li>
  <li><code class="component-api-token">DateRangePickerRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-range-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">start-input</code></li>
  <li><code class="component-part-token">end-input</code></li>
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

시작과 종료 입력이 달력 격자를 공유하되 각 양 끝의 이름을 독립적으로 유지합니다.
