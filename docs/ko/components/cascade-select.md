<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 단계별 선택

계층을 열 단위로 좁혀 가며 마지막 값을 선택합니다.

## 예시

### 지역

국가에서 도시까지 위치를 단계별로 선택합니다.

<ComponentExample component="cascade-select" scenario="location" title="지역" description="국가에서 도시까지 위치를 단계별로 선택합니다." :index="0" />

### 비활성 항목

키보드와 포인터 입력을 받지 않습니다.

<ComponentExample component="cascade-select" scenario="disabled" title="비활성 항목" description="키보드와 포인터 입력을 받지 않습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="cascade-select" />

## 공개 API

Vue 패키지: `@sectile/vue/cascade-select`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CascadeSelectRoot</code></li>
  <li><code class="component-api-token">CascadeSelectTrigger</code></li>
  <li><code class="component-api-token">CascadeSelectValue</code></li>
  <li><code class="component-api-token">CascadeSelectContent</code></li>
  <li><code class="component-api-token">CascadeSelectColumn</code></li>
  <li><code class="component-api-token">CascadeSelectItem</code></li>
  <li><code class="component-api-token">CascadeSelectItemIndicator</code></li>
  <li><code class="component-api-token">CascadeSelectItemChevron</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CascadeSelectRootProps</code></li>
  <li><code class="component-api-token">CascadeSelectRootSlotProps</code></li>
  <li><code class="component-api-token">CascadeSelectColumnProps</code></li>
  <li><code class="component-api-token">CascadeSelectColumnSlotProps</code></li>
  <li><code class="component-api-token">CascadeSelectItemProps</code></li>
  <li><code class="component-api-token">CascadeSelectItemSlotProps</code></li>
  <li><code class="component-api-token">CascadeSelectPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="cascade-select"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">value</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">column</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">item-indicator</code></li>
  <li><code class="component-part-token">item-chevron</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

각 열은 이름이 있는 목록 상자이며 항목은 선택·하위 가지·비활성 상태를 노출합니다.
