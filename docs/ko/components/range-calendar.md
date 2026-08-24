<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Range Calendar

항상 보이는 달력에서 양 끝을 포함하는 날짜 범위를 고릅니다.

## 예시

### 예약

예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다.

<ComponentExample component="range-calendar" scenario="booking" title="예약" description="예약의 시작일과 종료일을 양 끝을 포함하는 범위로 선택합니다." :index="0" />

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

공통 범위: <code class="component-scope-token">[data-scope="range-calendar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
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

항상 보이는 격자가 팝업 실행 요소 없이 범위의 양 끝과 그 사이 날짜를 모두 노출합니다.
