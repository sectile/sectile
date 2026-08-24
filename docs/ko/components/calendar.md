<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 달력

날짜 격자를 이동하고 사용할 수 없는 날을 건너뛰어 날짜를 고릅니다.

## 예시

### 월간 달력

완전한 한 달 격자에서 날짜를 이동하고 선택합니다.

<ComponentExample component="calendar" scenario="month" title="월간 달력" description="완전한 한 달 격자에서 날짜를 이동하고 선택합니다." :index="0" />

### 주간 달력

선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다.

<ComponentExample component="calendar" scenario="week" title="주간 달력" description="선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다." :index="1" />

### 주말 선택 제한

주말 날짜는 보여 주되 선택할 수 없게 합니다.

<ComponentExample component="calendar" scenario="disabled-weekends" title="주말 선택 제한" description="주말 날짜는 보여 주되 선택할 수 없게 합니다." :index="2" />

## 공개 API

Vue 패키지: `@sectile/vue/calendar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CalendarRoot</code></li>
  <li><code class="component-api-token">CalendarCell</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CalendarRootProps</code></li>
  <li><code class="component-api-token">CalendarRootSlotProps</code></li>
  <li><code class="component-api-token">CalendarCellProps</code></li>
  <li><code class="component-api-token">CalendarCellSlotProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="calendar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 하루 전 또는 다음 날로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 일주일 전 또는 다음 주로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 강조된 날짜를 선택합니다. |

## 접근성

루트는 이름이 있는 격자이며 각 칸은 행·열·선택·강조·비활성 상태를 노출합니다.
