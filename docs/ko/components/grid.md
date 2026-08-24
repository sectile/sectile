<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 격자

2차원 칸을 이동하고 값을 선택하거나 편집 상태로 들어갑니다.

## 예시

### 선택 가능

격자 사이를 이동하고 현재 칸을 선택합니다.

<ComponentExample component="grid" scenario="selectable" title="선택 가능" description="격자 사이를 이동하고 현재 칸을 선택합니다." :index="0" />

### 편집 가능

격자 이동을 유지하면서 현재 칸의 값을 편집합니다.

<ComponentExample component="grid" scenario="editable" title="편집 가능" description="격자 이동을 유지하면서 현재 칸의 값을 편집합니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/grid`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">GridRoot</code></li>
  <li><code class="component-api-token">GridRow</code></li>
  <li><code class="component-api-token">GridCell</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">GridRootProps</code></li>
  <li><code class="component-api-token">GridRootSlotProps</code></li>
  <li><code class="component-api-token">GridCellSlotProps</code></li>
  <li><code class="component-api-token">GridPartProps</code></li>
  <li><code class="component-api-token">GridEditMode</code></li>
  <li><code class="component-api-token">GridPolicies</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="grid"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">row</code></td>
  <td><code>[data-part="row"]</code></td>
  <td>같은 그리드 행에 속한 셀을 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 격자 칸 사이를 이동합니다. |
| <kbd>Space</kbd> | 현재 칸이나 행을 선택합니다. |
| <kbd>Enter</kbd> / <kbd>F2</kbd> | 현재 칸이 편집을 지원하면 편집 모드로 들어갑니다. |
| <kbd>Escape</kbd> | 현재 편집을 취소합니다. |

## 접근성

이름이 있는 격자가 행과 열 수를 전달하고 각 칸은 위치·선택·비활성 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/grid/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
