<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 페이지 나누기

큰 결과 목록을 직접 이동 가능한 페이지와 경계 버튼으로 줄여 보여 줍니다.

## 예시

### 간결한 표시

가로 공간이 좁을 때 필요한 제어 요소만 표시합니다.

<ComponentExample component="pagination" scenario="compact" title="간결한 표시" description="가로 공간이 좁을 때 필요한 제어 요소만 표시합니다." :index="0" />

### 긴 범위

모든 페이지 번호를 늘어놓지 않고 큰 결과 목록을 이동합니다.

<ComponentExample component="pagination" scenario="long-range" title="긴 범위" description="모든 페이지 번호를 늘어놓지 않고 큰 결과 목록을 이동합니다." :index="1" />

### 페이지당 항목 수

페이지당 항목 수를 바꾸고 필요하면 유효한 첫 페이지로 이동합니다.

<ComponentExample component="pagination" scenario="page-size" title="페이지당 항목 수" description="페이지당 항목 수를 바꾸고 필요하면 유효한 첫 페이지로 이동합니다." :index="2" />

### 페이지 번호만 표시

처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다.

<ComponentExample component="pagination" scenario="pages-only" title="페이지 번호만 표시" description="처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다." :index="3" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="pagination" />

## 공개 API

Vue 패키지: `@sectile/vue/pagination`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PaginationRoot</code></li>
  <li><code class="component-api-token">PaginationItem</code></li>
  <li><code class="component-api-token">PaginationFirst</code></li>
  <li><code class="component-api-token">PaginationPrevious</code></li>
  <li><code class="component-api-token">PaginationNext</code></li>
  <li><code class="component-api-token">PaginationLast</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PaginationRootProps</code></li>
  <li><code class="component-api-token">PaginationRootSlotProps</code></li>
  <li><code class="component-api-token">PaginationItemProps</code></li>
  <li><code class="component-api-token">PaginationItemSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="pagination"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">first</code></li>
  <li><code class="component-part-token">previous</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">next</code></li>
  <li><code class="component-part-token">last</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 버튼이나 링크로 제공되는 페이지 이동 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 페이지나 경계 이동 컨트롤을 실행합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 터미널에서는 첫 번째 또는 마지막 페이지로 이동합니다. |

## 접근성

페이지 링크나 버튼이 기본 실행 의미를 유지하고 위치에만 의존하지 않고 현재 페이지를 식별합니다.
