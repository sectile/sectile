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

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="popover" />

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

렌더링되는 파트는 기본적으로 `data-scope="popover"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">anchor</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">title</code></li>
  <li><code class="component-part-token">description</code></li>
  <li><code class="component-part-token">close</code></li>
  <li><code class="component-part-token">arrow</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 실행 요소나 포커스된 작업을 실행합니다. |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 사용 가능한 컨트롤 사이를 이동하며 모달 내용은 포커스를 내부에 유지합니다. |
| <kbd>Escape</kbd> | 팝업을 닫고 설정된 경우 포커스를 복원합니다. |

## 접근성

실행 요소가 열림 상태와 팝업 연결을 노출하고 선택적인 제목과 설명이 떠 있는 내용의 이름을 제공합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
