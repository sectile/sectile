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

공통 범위: <code class="component-scope-token">[data-scope="pagination"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">first</code></td>
  <td><code>[data-part="first"]</code></td>
  <td>첫 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous</code></td>
  <td><code>[data-part="previous"]</code></td>
  <td>이전 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next</code></td>
  <td><code>[data-part="next"]</code></td>
  <td>다음 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">last</code></td>
  <td><code>[data-part="last"]</code></td>
  <td>마지막 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 버튼이나 링크로 제공되는 페이지 이동 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 페이지나 경계 이동 컨트롤을 실행합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 터미널에서는 첫 번째 또는 마지막 페이지로 이동합니다. |

## 접근성

페이지 링크나 버튼이 기본 실행 의미를 유지하고 위치에만 의존하지 않고 현재 페이지를 식별합니다.
