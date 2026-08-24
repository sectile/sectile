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

공통 범위: <code class="component-scope-token">[data-scope="date-time-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">date-time-input</code></td>
  <td><code>[data-part="date-time-input"]</code></td>
  <td>날짜와 시간을 하나의 값으로 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">date-input</code></td>
  <td><code>[data-part="date-input"]</code></td>
  <td>날짜·시간 값의 날짜 부분을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">time-input</code></td>
  <td><code>[data-part="time-input"]</code></td>
  <td>날짜·시간 값의 시간 부분을 편집합니다.</td>
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

날짜와 시간 입력에 이름을 유지하고 팝업 달력은 격자 의미와 명시적인 실행 요소를 사용합니다.
