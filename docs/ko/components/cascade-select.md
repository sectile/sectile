<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 단계별 선택

계층을 열 단위로 좁혀 가며 마지막 값을 선택합니다.

## 예시

### 지역

국가에서 도시까지 위치를 단계별로 선택합니다.

<ComponentExample component="cascade-select" scenario="location" title="지역" description="국가에서 도시까지 위치를 단계별로 선택합니다." :index="0" />

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

공통 범위: <code class="component-scope-token">[data-scope="cascade-select"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">value</code></td>
  <td><code>[data-part="value"]</code></td>
  <td>현재 확정 값을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">column</code></td>
  <td><code>[data-part="column"]</code></td>
  <td>계층형 선택 항목의 한 단계를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-chevron</code></td>
  <td><code>[data-part="item-chevron"]</code></td>
  <td>항목에 하위 단계가 있음을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

각 열은 이름이 있는 목록 상자이며 항목은 선택·하위 가지·비활성 상태를 노출합니다.
