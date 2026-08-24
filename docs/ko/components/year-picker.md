<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Year Picker

페이지로 나뉜 연도 격자에서 해 하나를 고릅니다.

## 예시

### graduation year

페이지로 나뉜 연도 격자에서 졸업 연도 하나를 고릅니다.

<ComponentExample component="year-picker" scenario="graduation-year" title="graduation year" description="페이지로 나뉜 연도 격자에서 졸업 연도 하나를 고릅니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="year-picker" />

## 공개 API

Vue 패키지: `@sectile/vue/year-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearPickerRoot</code></li>
  <li><code class="component-api-token">YearPickerTrigger</code></li>
  <li><code class="component-api-token">YearPickerContent</code></li>
  <li><code class="component-api-token">YearPickerGrid</code></li>
  <li><code class="component-api-token">YearPickerCell</code></li>
  <li><code class="component-api-token">YearPickerInput</code></li>
  <li><code class="component-api-token">YearPickerPreviousPage</code></li>
  <li><code class="component-api-token">YearPickerNextPage</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">YearPickerRootProps</code></li>
  <li><code class="component-api-token">YearPickerValue</code></li>
  <li><code class="component-api-token">YearPickerPartProps</code></li>
  <li><code class="component-api-token">YearPickerRootSlotProps</code></li>
  <li><code class="component-api-token">YearPickerCellSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="year-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">input</code></li>
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

이름이 있는 입력과 실행 요소가 선택·강조·비활성 칸이 있는 연도 격자를 연결합니다.
