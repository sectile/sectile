<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Year Picker

페이지로 나뉜 연도 격자에서 해 하나를 고릅니다.

## 용법

### graduation year

페이지로 나뉜 연도 격자에서 졸업 연도 하나를 고릅니다.

<ComponentExample component="year-picker" scenario="graduation-year" title="graduation year" description="페이지로 나뉜 연도 격자에서 졸업 연도 하나를 고릅니다." :index="0" />

### planning 표시 구간

현재 연도 페이지에서 계획 연도 하나를 고릅니다.

<ComponentExample component="year-picker" scenario="planning-window" title="planning 표시 구간" description="현재 연도 페이지에서 계획 연도 하나를 고릅니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="year-picker" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/year-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearPickerRoot</code></li>
  <li><code class="component-api-token">YearPickerTrigger</code></li>
  <li><code class="component-api-token">YearPickerPortal</code></li>
  <li><code class="component-api-token">YearPickerContent</code></li>
  <li><code class="component-api-token">YearPickerGrid</code></li>
  <li><code class="component-api-token">YearPickerCell</code></li>
  <li><code class="component-api-token">YearPickerInput</code></li>
  <li><code class="component-api-token">YearPickerPreviousPage</code></li>
  <li><code class="component-api-token">YearPickerNextPage</code></li>
</ul>
</div>

### Props

#### `YearPickerRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>align</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['align']</code></span><span><span class="component-api-definition__label">기본값</span><code>'start'</code></span></div>
<p>기준 요소를 중심으로 팝업 내용을 정렬할 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>autoUpdate</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['autoUpdate']</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>레이아웃 변화에 맞춰 팝업 위치를 갱신할 방법입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>avoidCollisions</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>팝업이 화면 안에 남도록 위치를 뒤집거나 이동할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>collisionBoundary</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['collisionBoundary']</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>팝업을 화면 안에 유지할 때 사용할 경계입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>collisionPadding</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['collisionPadding']</code></span><span><span class="component-api-definition__label">기본값</span><code>8</code></span></div>
<p>팝업과 충돌 경계 사이에 둘 간격입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultHighlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컴포넌트가 관리하는 처음 강조 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultOpen</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>컴포넌트가 관리하는 초기 열림 상태입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerRootSlotProps['viewMode']</code></span><span><span class="component-api-definition__label">기본값</span><code>'year'</code></span></div>
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
<dt><code>hideWhenDetached</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>기준 요소가 레이아웃에서 벗어나면 팝업을 숨길지 여부입니다.</p>
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
<dt><code>middleware</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['middleware']</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>기본 배치 규칙 뒤에 적용할 위치 계산 미들웨어입니다.</p>
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
<dt><code>open</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DatePickerOptions['policies']</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>position</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>실행 요소를 기준으로 팝업 위치를 계산할지 여부입니다.</p>
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
<dt><code>referenceDate</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DateValue</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>달력에 선택값이나 강조값이 없을 때 사용할 시간대 없는 기준 날짜입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>side</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['side']</code></span><span><span class="component-api-definition__label">기본값</span><code>'bottom'</code></span></div>
<p>기준 요소를 중심으로 팝업을 우선 배치할 방향입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>sideOffset</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>4</code></span></div>
<p>팝업과 기준 요소 사이 거리입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>strategy</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerPositionOptions['strategy']</code></span><span><span class="component-api-definition__label">기본값</span><code>'absolute'</code></span></div>
<p>기준 요소에 연결된 콘텐츠의 CSS 위치 전략입니다.</p>
</dd>
</div>
</dl>

#### `YearPickerPartProps`

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

#### `YearPickerPortalProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>defer</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>Teleport 대상을 현재 mount 또는 update tick이 끝날 때 찾을지 여부입니다.</p>
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
<dt><code>to</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | HTMLElement</code></span><span><span class="component-api-definition__label">기본값</span><code>'body'</code></span></div>
<p>포털 콘텐츠를 옮길 대상입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `YearPickerRootSlotProps`

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
<dt><code>open</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Value</code></span></div>
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
<div class="component-api-definition">
<dt><code>years</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (readonly PickerYearValue[])[]</code></span></div>
<p>현재 보기에 표시할 연도입니다.</p>
</dd>
</div>
</dl>

#### `YearPickerCellSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>current</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 위치를 나타내는 항목인지 여부입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PickerYearValue</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `YearPickerValueChangeHandler`

```ts
type YearPickerValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:modelValue']>
```

#### `YearPickerOpenChangeHandler`

```ts
type YearPickerOpenChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:open']>
```

#### `YearPickerHighlightedValueChangeHandler`

```ts
type YearPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:highlightedValue']>
```

#### `YearPickerPositionChangeHandler`

```ts
type YearPickerPositionChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onPositionChange']>
```

#### `YearPickerValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |
| `day` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="year-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">previous-page</code></td>
  <td><code>[data-part="previous-page"]</code></td>
  <td>이전 페이지(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-page</code></td>
  <td><code>[data-part="next-page"]</code></td>
  <td>다음 페이지(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 현재 페이지의 연도 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도 페이지로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 연도를 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 연도 격자를 닫습니다. |

## 접근성

이름이 있는 입력과 실행 요소가 선택·강조·비활성 칸이 있는 연도 격자를 연결합니다.
