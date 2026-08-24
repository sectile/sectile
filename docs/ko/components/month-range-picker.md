<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Month Range Picker

한 해의 월 격자에서 양 끝을 포함하는 달 범위를 고릅니다.

## 예시

### reporting period

보고서에 포함할 첫 달과 마지막 달을 고릅니다.

<ComponentExample component="month-range-picker" scenario="reporting-period" title="reporting period" description="보고서에 포함할 첫 달과 마지막 달을 고릅니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/month-range-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthRangePickerRoot</code></li>
  <li><code class="component-api-token">MonthRangePickerTrigger</code></li>
  <li><code class="component-api-token">MonthRangePickerContent</code></li>
  <li><code class="component-api-token">MonthRangePickerGrid</code></li>
  <li><code class="component-api-token">MonthRangePickerCell</code></li>
  <li><code class="component-api-token">MonthRangePickerStartInput</code></li>
  <li><code class="component-api-token">MonthRangePickerEndInput</code></li>
  <li><code class="component-api-token">MonthRangePickerPreviousYear</code></li>
  <li><code class="component-api-token">MonthRangePickerNextYear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthRangePickerRootProps</code></li>
  <li><code class="component-api-token">MonthRangePickerValue</code></li>
  <li><code class="component-api-token">MonthPickerValue</code></li>
  <li><code class="component-api-token">MonthRangePickerCellSlotProps</code></li>
  <li><code class="component-api-token">MonthRangePickerPartProps</code></li>
  <li><code class="component-api-token">MonthRangePickerRootSlotProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="month-range-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Arrow keys</kbd> | 연도 격자에서 달 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 달을 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 월 격자를 닫습니다. |

## 접근성

시작·종료 월 입력이 하나의 연도 격자를 공유하면서 양 끝의 이름을 독립적으로 유지합니다.
