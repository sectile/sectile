<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 팝오버

페이지를 막지 않고 실행 요소에 상호작용 가능한 내용을 붙입니다.

## 예시

### 기준 요소에 연결된

주변 배치가 바뀌어도 팝업을 실행 요소에 붙여 둡니다.

<ComponentExample component="popover" scenario="anchored" title="기준 요소에 연결된" description="주변 배치가 바뀌어도 팝업을 실행 요소에 붙여 둡니다." :index="0" />

### 화면 경계 회피

원하는 위치가 화면을 벗어나면 팝업을 반대편으로 옮기거나 안쪽으로 밀어 넣습니다.

<ComponentExample component="popover" scenario="collision" title="화면 경계 회피" description="원하는 위치가 화면을 벗어나면 팝업을 반대편으로 옮기거나 안쪽으로 밀어 넣습니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/popover`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PopoverRoot</code></li>
  <li><code class="component-api-token">PopoverTrigger</code></li>
  <li><code class="component-api-token">PopoverAnchor</code></li>
  <li><code class="component-api-token">PopoverPortal</code></li>
  <li><code class="component-api-token">PopoverContent</code></li>
  <li><code class="component-api-token">PopoverTitle</code></li>
  <li><code class="component-api-token">PopoverDescription</code></li>
  <li><code class="component-api-token">PopoverClose</code></li>
  <li><code class="component-api-token">PopoverArrow</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PopoverRootProps</code></li>
  <li><code class="component-api-token">PopoverRootSlotProps</code></li>
  <li><code class="component-api-token">PopoverPartProps</code></li>
  <li><code class="component-api-token">PopoverPortalProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="popover"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">anchor</code></td>
  <td><code>[data-part="anchor"]</code></td>
  <td>떠 있는 콘텐츠의 배치 기준을 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">title</code></td>
  <td><code>[data-part="title"]</code></td>
  <td>연결된 콘텐츠의 제목을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">close</code></td>
  <td><code>[data-part="close"]</code></td>
  <td>현재 화면을 닫거나 해제합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">arrow</code></td>
  <td><code>[data-part="arrow"]</code></td>
  <td>떠 있는 콘텐츠와 기준점을 시각적으로 연결합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 실행 요소나 포커스된 작업을 실행합니다. |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 사용 가능한 컨트롤 사이를 이동하며 모달 내용은 포커스를 내부에 유지합니다. |
| <kbd>Escape</kbd> | 팝업을 닫고 설정된 경우 포커스를 복원합니다. |

## 접근성

실행 요소가 열림 상태와 팝업 연결을 노출하고 선택적인 제목과 설명이 떠 있는 내용의 이름을 제공합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
