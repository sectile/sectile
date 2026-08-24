<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Year Range Picker

페이지로 나뉜 연도 격자에서 양 끝을 포함하는 연도 범위를 고릅니다.

## 예시

### roadmap horizon

로드맵에 포함할 첫 해와 마지막 해를 고릅니다.

<ComponentExample component="year-range-picker" scenario="roadmap-horizon" title="roadmap horizon" description="로드맵에 포함할 첫 해와 마지막 해를 고릅니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="year-range-picker" />

## 공개 API

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

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearRangePickerRootProps</code></li>
  <li><code class="component-api-token">YearRangePickerValue</code></li>
  <li><code class="component-api-token">YearPickerValue</code></li>
  <li><code class="component-api-token">YearRangePickerPartProps</code></li>
  <li><code class="component-api-token">YearRangePickerRootSlotProps</code></li>
  <li><code class="component-api-token">YearRangePickerCellSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="year-range-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">start-input</code></li>
  <li><code class="component-part-token">end-input</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">grid</code></li>
  <li><code class="component-part-token">cell</code></li>
  <li><code class="component-part-token">previous-page</code></li>
  <li><code class="component-part-token">next-page</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 현재 페이지의 연도 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도 페이지로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 연도를 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 연도 격자를 닫습니다. |

## 접근성

시작·종료 연도 입력이 페이지형 격자를 공유하고 양 끝을 포함하는 연도 범위를 노출합니다.
