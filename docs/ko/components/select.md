<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 선택 상자

실행 요소가 여는 팝업 목록에서 값 하나를 고릅니다.

## 예시

### 실행 환경 선택

팝업 목록에서 하나의 배포 환경을 고릅니다.

<ComponentExample component="select" scenario="environment" title="실행 환경 선택" description="팝업 목록에서 하나의 배포 환경을 고릅니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/select`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SelectRoot</code></li>
  <li><code class="component-api-token">SelectTrigger</code></li>
  <li><code class="component-api-token">SelectValue</code></li>
  <li><code class="component-api-token">SelectContent</code></li>
  <li><code class="component-api-token">SelectItem</code></li>
  <li><code class="component-api-token">SelectItemIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SelectRootProps</code></li>
  <li><code class="component-api-token">SelectRootSlotProps</code></li>
  <li><code class="component-api-token">SelectItemProps</code></li>
  <li><code class="component-api-token">SelectItemSlotProps</code></li>
  <li><code class="component-api-token">SelectPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="select"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

실행 요소가 열림 상태를 노출하고 팝업 목록 상자가 선택·강조·비활성 항목을 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
