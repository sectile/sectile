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

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="calendar" />

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

렌더링되는 파트는 기본적으로 `data-scope="calendar"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">cell</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 하루 전 또는 다음 날로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 일주일 전 또는 다음 주로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 강조된 날짜를 선택합니다. |

## 접근성

루트는 이름이 있는 격자이며 각 칸은 행·열·선택·강조·비활성 상태를 노출합니다.
