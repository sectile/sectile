<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Month Picker

한 해의 월 격자에서 달 하나를 고릅니다.

## 예시

### billing 월간 달력

다음 결제 주기에 사용할 달을 고릅니다.

<ComponentExample component="month-picker" scenario="billing-month" title="billing 월간 달력" description="다음 결제 주기에 사용할 달을 고릅니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="month-picker" />

## 공개 API

Vue 패키지: `@sectile/vue/month-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthPickerRoot</code></li>
  <li><code class="component-api-token">MonthPickerTrigger</code></li>
  <li><code class="component-api-token">MonthPickerContent</code></li>
  <li><code class="component-api-token">MonthPickerGrid</code></li>
  <li><code class="component-api-token">MonthPickerCell</code></li>
  <li><code class="component-api-token">MonthPickerInput</code></li>
  <li><code class="component-api-token">MonthPickerPreviousYear</code></li>
  <li><code class="component-api-token">MonthPickerNextYear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthPickerRootProps</code></li>
  <li><code class="component-api-token">MonthPickerValue</code></li>
  <li><code class="component-api-token">MonthPickerCellSlotProps</code></li>
  <li><code class="component-api-token">MonthPickerPartProps</code></li>
  <li><code class="component-api-token">MonthPickerRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="month-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">input</code></li>
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

이름이 있는 입력과 실행 요소가 연도 격자를 연결하며 각 칸은 달의 선택·강조·비활성 상태를 노출합니다.
