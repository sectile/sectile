<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Year Range Picker

페이지로 나뉜 연도 격자에서 양 끝을 포함하는 연도 범위를 고릅니다.

## 용법

### roadmap horizon

로드맵에 포함할 첫 해와 마지막 해를 고릅니다.

<ComponentExample component="year-range-picker" scenario="roadmap-horizon" title="roadmap horizon" description="로드맵에 포함할 첫 해와 마지막 해를 고릅니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="year-range-picker" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="year-range-picker" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/year-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearRangePickerRoot</code></li>
  <li><code class="component-api-token">YearRangePickerTrigger</code></li>
  <li><code class="component-api-token">YearRangePickerContent</code></li>
  <li><code class="component-api-token">YearRangePickerGrid</code></li>
  <li><code class="component-api-token">YearRangePickerCell</code></li>
  <li><code class="component-api-token">YearRangePickerStartInput</code></li>
  <li><code class="component-api-token">YearRangePickerEndInput</code></li>
  <li><code class="component-api-token">YearRangePickerPreviousPage</code></li>
  <li><code class="component-api-token">YearRangePickerNextPage</code></li>
</ul>
</div>

### Props

#### `YearRangePickerRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `DateRange \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `DateRange \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `highlightedValue` | `DateValue` | `undefined` | 키보드 조작 대상으로 강조된 현재 값입니다. |
| `defaultHighlightedValue` | `DateValue` | `undefined` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `DateRangePickerOptions['policies']` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |

#### `YearRangePickerPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `YearRangePickerRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `PickerValue` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `DateValue` | 조작 대상으로 강조된 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `view` | `{ readonly year: number; readonly month: number }` | 현재 달력 기준점입니다. |
| `viewMode` | `DatePickerViewMode` | 현재 달력 보기 방식입니다. |
| `dates` | `readonly (readonly DateValue[])[]` | 현재 보기에 표시할 날짜입니다. |
| `months` | `readonly (readonly DatePickerMonthValue[])[]` | 현재 보기에 표시할 달입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `years` | `readonly (readonly PickerYearValue[])[]` | 현재 보기에 표시할 연도입니다. |

#### `YearRangePickerCellSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `PickerYearValue` | 이 계약이 노출하는 현재 값입니다. |
| `current` | `boolean` | 현재 위치를 나타내는 항목인지 여부입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `inRange` | `boolean` | 선택한 범위 안에 있는 값인지 여부입니다. |

### 이벤트

#### `YearRangePickerRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `PickerValue` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:highlightedValue` | `DateValue` | 새 강조 값을 요청할 때 발생합니다. |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |

### 기타 타입

#### `YearRangePickerValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `start` | `DateValue` | 필수 |
| `end` | `DateValue` | 필수 |

#### `YearPickerValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `year` | `number` | 필수 |
| `month` | `number` | 필수 |
| `day` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="year-range-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">start-input</code></td>
  <td><code>[data-part="start-input"]</code></td>
  <td>시작 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-input</code></td>
  <td><code>[data-part="end-input"]</code></td>
  <td>종료 값을 편집합니다.</td>
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

시작·종료 연도 입력이 페이지형 격자를 공유하고 양 끝을 포함하는 연도 범위를 노출합니다.
