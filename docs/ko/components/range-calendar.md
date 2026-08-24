<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Range Calendar

항상 보이는 달력에서 양 끝을 포함하는 날짜 범위를 고릅니다.

## 예시

### 예약

예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다.

<ComponentExample component="range-calendar" scenario="booking" title="예약" description="예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="range-calendar" />

## 공개 API

Vue 패키지: `@sectile/vue/range-calendar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RangeCalendarRoot</code></li>
  <li><code class="component-api-token">RangeCalendarContent</code></li>
  <li><code class="component-api-token">RangeCalendarGrid</code></li>
  <li><code class="component-api-token">RangeCalendarCell</code></li>
  <li><code class="component-api-token">RangeCalendarPreviousMonth</code></li>
  <li><code class="component-api-token">RangeCalendarNextMonth</code></li>
  <li><code class="component-api-token">RangeCalendarPreviousYear</code></li>
  <li><code class="component-api-token">RangeCalendarNextYear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RangeCalendarRootProps</code></li>
  <li><code class="component-api-token">DateRange</code></li>
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">RangeCalendarCellSlotProps</code></li>
  <li><code class="component-api-token">RangeCalendarPartProps</code></li>
  <li><code class="component-api-token">RangeCalendarRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="range-calendar"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">grid</code></li>
  <li><code class="component-part-token">cell</code></li>
  <li><code class="component-part-token">previous-month</code></li>
  <li><code class="component-part-token">next-month</code></li>
  <li><code class="component-part-token">previous-year</code></li>
  <li><code class="component-part-token">next-year</code></li>
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

항상 보이는 격자가 팝업 실행 요소 없이 범위의 양 끝과 그 사이 날짜를 모두 노출합니다.
