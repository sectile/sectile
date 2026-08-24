<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜 선택기

주·월·연 보기에서 사용할 수 있는 날짜 하나를 고릅니다.

## 예시

### 하나만 선택

한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다.

<ComponentExample component="date-picker" scenario="single" title="하나만 선택" description="한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다." :index="0" />

### 평일만 선택

모든 날짜를 보여 주되 평일만 선택할 수 있게 합니다.

<ComponentExample component="date-picker" scenario="weekdays" title="평일만 선택" description="모든 날짜를 보여 주되 평일만 선택할 수 있게 합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-picker" />

## 공개 API

Vue 패키지: `@sectile/vue/date-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DatePickerRoot</code></li>
  <li><code class="component-api-token">DatePickerTrigger</code></li>
  <li><code class="component-api-token">DatePickerContent</code></li>
  <li><code class="component-api-token">DatePickerGrid</code></li>
  <li><code class="component-api-token">DatePickerCell</code></li>
  <li><code class="component-api-token">DatePickerMonthCell</code></li>
  <li><code class="component-api-token">DatePickerInput</code></li>
  <li><code class="component-api-token">DatePickerPreviousWeek</code></li>
  <li><code class="component-api-token">DatePickerNextWeek</code></li>
  <li><code class="component-api-token">DatePickerPreviousMonth</code></li>
  <li><code class="component-api-token">DatePickerNextMonth</code></li>
  <li><code class="component-api-token">DatePickerPreviousYear</code></li>
  <li><code class="component-api-token">DatePickerNextYear</code></li>
  <li><code class="component-api-token">DatePickerWeekViewTrigger</code></li>
  <li><code class="component-api-token">DatePickerMonthViewTrigger</code></li>
  <li><code class="component-api-token">DatePickerYearViewTrigger</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DatePickerRootProps</code></li>
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">DatePickerCellSlotProps</code></li>
  <li><code class="component-api-token">DatePickerMonthCellSlotProps</code></li>
  <li><code class="component-api-token">DatePickerPartProps</code></li>
  <li><code class="component-api-token">DatePickerRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">input</code></li>
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

이름이 있는 입력과 실행 요소가 달력 격자를 연결하며 각 칸은 선택·강조·비활성 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
