<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 달력

날짜 격자를 이동하고 사용할 수 없는 날을 건너뛰어 날짜를 고릅니다.

## 용법

### 월간 달력

완전한 한 달 격자에서 날짜를 이동하고 선택합니다.

<ComponentExample component="calendar" scenario="month" title="월간 달력" description="완전한 한 달 격자에서 날짜를 이동하고 선택합니다." :index="0" />

### 주간 달력

선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다.

<ComponentExample component="calendar" scenario="week" title="주간 달력" description="선택과 날짜 이동 기능을 유지하면서 한 주의 7일만 집중해 봅니다." :index="1" />

### 주말 선택 제한

주말 날짜는 보여 주되 선택할 수 없게 합니다.

<ComponentExample component="calendar" scenario="disabled-weekends" title="주말 선택 제한" description="주말 날짜는 보여 주되 선택할 수 없게 합니다." :index="2" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="calendar" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/calendar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CalendarRoot</code></li>
  <li><code class="component-api-token">CalendarContent</code></li>
  <li><code class="component-api-token">CalendarGrid</code></li>
  <li><code class="component-api-token">CalendarCell</code></li>
  <li><code class="component-api-token">CalendarMonthCell</code></li>
  <li><code class="component-api-token">CalendarInput</code></li>
  <li><code class="component-api-token">CalendarPreviousWeek</code></li>
  <li><code class="component-api-token">CalendarNextWeek</code></li>
  <li><code class="component-api-token">CalendarPreviousMonth</code></li>
  <li><code class="component-api-token">CalendarNextMonth</code></li>
  <li><code class="component-api-token">CalendarPreviousYear</code></li>
  <li><code class="component-api-token">CalendarNextYear</code></li>
  <li><code class="component-api-token">CalendarWeekViewTrigger</code></li>
  <li><code class="component-api-token">CalendarMonthViewTrigger</code></li>
  <li><code class="component-api-token">CalendarYearViewTrigger</code></li>
</ul>
</div>

### Props

#### `CalendarRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>defaultHighlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컴포넌트가 관리하는 처음 강조 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue | null</code></span><span><span class="component-api-definition__label">기본값</span><code>null</code></span></div>
<p>컴포넌트가 값을 관리할 때 사용할 초깃값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultView</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CalendarViewMode</code></span><span><span class="component-api-definition__label">기본값</span><code>'month'</code></span></div>
<p>달력 또는 선택기의 초기 보기입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>키보드 조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CalendarPolicies</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
</dl>

#### `CalendarCellProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'button'</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `CalendarMonthCellProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'button'</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CalendarMonthValue</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `CalendarPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `CalendarRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>dates</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (readonly DateValue[])[]</code></span></div>
<p>현재 보기에 표시할 날짜입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span></div>
<p>조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>months</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (readonly CalendarMonthValue[])[]</code></span></div>
<p>현재 보기에 표시할 달입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue | null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>view</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>{ readonly year: number; readonly month: number }</code></span></div>
<p>현재 달력 기준점입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>viewMode</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CalendarViewMode</code></span></div>
<p>현재 달력 보기 방식입니다.</p>
</dd>
</div>
</dl>

#### `CalendarCellSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlighted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>조작 대상으로 강조된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>inRange</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>선택한 범위 안에 있는 값인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>outsideMonth</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>인접한 달의 날짜인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>selected</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 선택된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `CalendarMonthCellSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlighted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>조작 대상으로 강조된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>inRange</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>선택한 범위 안에 있는 값인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>selected</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 선택된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CalendarMonthValue</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `CalendarRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>DateValue</code></span></div>
<p>새 강조 값을 요청할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>DateValue | null</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `CalendarValueChangeHandler`

```ts
type CalendarValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:modelValue']>
```

#### `CalendarHighlightedValueChangeHandler`

```ts
type CalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:highlightedValue']>
```

#### `CalendarMonthValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |

#### `CalendarPolicies`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `min` | `DateValue` | — |
| `max` | `DateValue` | — |
| `required` | `boolean` | — |
| `unavailable` | `(value: DateValue) => boolean` | — |
| `weekStartsOn` | `1 \| 2 \| 3 \| 4 \| 5 \| 6 \| 7` | — |
| `maxScan` | `number` | — |

#### `CalendarViewMode`

```ts
type CalendarViewMode = 'week' | 'month' | 'year'
```

#### `DateValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |
| `day` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="calendar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>선택한 날짜를 네이티브 폼 제출 값으로 유지합니다.</td>
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
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 하루 전 또는 다음 날로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 일주일 전 또는 다음 주로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 한 주의 시작 또는 끝으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 한 달 단위로 이동하고, Shift와 함께 누르면 일 년 단위로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 강조된 날짜를 선택합니다. |

## 접근성

인라인 콘텐츠가 이름 있는 격자를 소유하며 각 칸은 선택·강조·선택 불가·현재 달 외부 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
