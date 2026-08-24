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

공통 범위: <code class="component-scope-token">[data-scope="date-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
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

이름이 있는 입력과 실행 요소가 달력 격자를 연결하며 각 칸은 선택·강조·비활성 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
