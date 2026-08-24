<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 목록 상자

화면에 보이는 항목을 이동해 하나 또는 여러 값을 선택합니다.

## 예시

### 하나만 선택

한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다.

<ComponentExample component="listbox" scenario="single" title="하나만 선택" description="한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다." :index="0" />

### 여러 항목 선택

기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다.

<ComponentExample component="listbox" scenario="multiple" title="여러 항목 선택" description="기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다." :index="1" />

### 따라가기 포커스

목록 상자의 현재 항목이 이동할 때 선택도 함께 옮깁니다.

<ComponentExample component="listbox" scenario="follow-focus" title="따라가기 포커스" description="목록 상자의 현재 항목이 이동할 때 선택도 함께 옮깁니다." :index="2" />

## 공개 API

Vue 패키지: `@sectile/vue/listbox`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ListboxRoot</code></li>
  <li><code class="component-api-token">ListboxItem</code></li>
  <li><code class="component-api-token">ListboxItemText</code></li>
  <li><code class="component-api-token">ListboxItemIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ListboxSelectionMode</code></li>
  <li><code class="component-api-token">ListboxValue</code></li>
  <li><code class="component-api-token">ListboxRootProps</code></li>
  <li><code class="component-api-token">ListboxRootSlotProps</code></li>
  <li><code class="component-api-token">ListboxItemProps</code></li>
  <li><code class="component-api-token">ListboxItemSlotProps</code></li>
  <li><code class="component-api-token">ListboxPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="listbox"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-text</code></td>
  <td><code>[data-part="item-text"]</code></td>
  <td>항목 레이블을 조작부와 분리해 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
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

이름이 있는 목록 상자가 모든 항목으로 DOM 포커스를 옮기지 않고 현재·선택·비활성 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
