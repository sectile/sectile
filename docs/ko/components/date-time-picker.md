<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜·시간 선택기

입력 필드와 달력을 연결해 현지 날짜와 시각을 고릅니다.

## 예시

### 일정 선택

배포 날짜와 현지 시각을 함께 선택합니다.

<ComponentExample component="date-time-picker" scenario="schedule" title="일정 선택" description="배포 날짜와 현지 시각을 함께 선택합니다." :index="0" />

### 오전

오전의 날짜와 시각을 하나의 현지 일정으로 선택합니다.

<ComponentExample component="date-time-picker" scenario="morning" title="오전" description="오전의 날짜와 시각을 하나의 현지 일정으로 선택합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="date-time-picker" />

## 공개 API

Vue 패키지: `@sectile/vue/date-time-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimePickerRoot</code></li>
  <li><code class="component-api-token">DateTimePickerTrigger</code></li>
  <li><code class="component-api-token">DateTimePickerContent</code></li>
  <li><code class="component-api-token">DateTimePickerGrid</code></li>
  <li><code class="component-api-token">DateTimePickerCell</code></li>
  <li><code class="component-api-token">DateTimePickerMonthCell</code></li>
  <li><code class="component-api-token">DateTimePickerDateTimeInput</code></li>
  <li><code class="component-api-token">DateTimePickerDateInput</code></li>
  <li><code class="component-api-token">DateTimePickerTimeInput</code></li>
  <li><code class="component-api-token">DateTimePickerPreviousWeek</code></li>
  <li><code class="component-api-token">DateTimePickerNextWeek</code></li>
  <li><code class="component-api-token">DateTimePickerPreviousMonth</code></li>
  <li><code class="component-api-token">DateTimePickerNextMonth</code></li>
  <li><code class="component-api-token">DateTimePickerPreviousYear</code></li>
  <li><code class="component-api-token">DateTimePickerNextYear</code></li>
  <li><code class="component-api-token">DateTimePickerWeekViewTrigger</code></li>
  <li><code class="component-api-token">DateTimePickerMonthViewTrigger</code></li>
  <li><code class="component-api-token">DateTimePickerYearViewTrigger</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimePickerRootProps</code></li>
  <li><code class="component-api-token">DateTimeValue</code></li>
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">DateTimePickerCellSlotProps</code></li>
  <li><code class="component-api-token">DateTimePickerMonthCellSlotProps</code></li>
  <li><code class="component-api-token">DateTimePickerPartProps</code></li>
  <li><code class="component-api-token">DateTimePickerRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="date-time-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">date-time-input</code></li>
  <li><code class="component-part-token">date-input</code></li>
  <li><code class="component-part-token">time-input</code></li>
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

`provider`는 DOM 요소를 만들지 않는 상태 제공자입니다.

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 강조된 날짜를 하루 또는 일주일 단위로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 한 달 단위로 이동하고, Shift와 함께 누르면 일 년 단위로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 날짜를 선택합니다. |
| <kbd>Escape</kbd> | 다른 날짜를 선택하지 않고 달력을 닫습니다. |

## 접근성

날짜와 시간 입력에 이름을 유지하고 팝업 달력은 격자 의미와 명시적인 실행 요소를 사용합니다.
