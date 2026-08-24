<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 계층 보기

포커스와 선택을 나눠 유지하면서 펼칠 수 있는 계층을 탐색합니다.

## 예시

### 프로젝트 탐색

각 폴더의 펼침 상태를 따로 유지하면서 실제 프로젝트 계층을 탐색합니다.

<ComponentExample component="tree-view" scenario="expanded" title="프로젝트 탐색" description="각 폴더의 펼침 상태를 따로 유지하면서 실제 프로젝트 계층을 탐색합니다." :index="0" />

### 검토 파일 선택

폴더 펼침과 선택을 혼동하지 않고 검토할 파일 여러 개를 고릅니다.

<ComponentExample component="tree-view" scenario="multiple" title="검토 파일 선택" description="폴더 펼침과 선택을 혼동하지 않고 검토할 파일 여러 개를 고릅니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/tree-view`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeViewRoot</code></li>
  <li><code class="component-api-token">TreeViewGroup</code></li>
  <li><code class="component-api-token">TreeViewItem</code></li>
  <li><code class="component-api-token">TreeViewDisclosure</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TreeViewRootProps</code></li>
  <li><code class="component-api-token">TreeViewRootSlotProps</code></li>
  <li><code class="component-api-token">TreeViewItemSlotProps</code></li>
  <li><code class="component-api-token">TreeViewPartProps</code></li>
  <li><code class="component-api-token">TreeNodeInput</code></li>
  <li><code class="component-api-token">TreeViewPolicies</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tree-view"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">group</code></td>
  <td><code>[data-part="group"]</code></td>
  <td>관련 하위 항목을 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">disclosure</code></td>
  <td><code>[data-part="disclosure"]</code></td>
  <td>하위 콘텐츠를 펼치거나 접습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 보이는 트리 항목 사이를 이동합니다. |
| <kbd>Arrow Right</kbd> | 가지를 펼치거나 첫 번째 자식으로 이동합니다. |
| <kbd>Arrow Left</kbd> | 가지를 접거나 부모로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |

## 접근성

트리 항목이 단계·펼침·선택·비활성 상태를 노출하고 하나의 이동 탭 위치를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
