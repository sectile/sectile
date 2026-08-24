<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Month Range Picker

한 해의 월 격자에서 양 끝을 포함하는 달 범위를 고릅니다.

## 예시

### reporting period

보고서에 포함할 첫 달과 마지막 달을 고릅니다.

<ComponentExample component="month-range-picker" scenario="reporting-period" title="reporting period" description="보고서에 포함할 첫 달과 마지막 달을 고릅니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="month-range-picker" />

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

렌더링되는 파트는 기본적으로 `data-scope="month-range-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">start-input</code></li>
  <li><code class="component-part-token">end-input</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">grid</code></li>
  <li><code class="component-part-token">cell</code></li>
  <li><code class="component-part-token">previous-year</code></li>
  <li><code class="component-part-token">next-year</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 연도 격자에서 달 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 달을 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 월 격자를 닫습니다. |

## 접근성

시작·종료 월 입력이 하나의 연도 격자를 공유하면서 양 끝의 이름을 독립적으로 유지합니다.
