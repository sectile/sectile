<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 대화상자

모달 또는 비모달 방식으로 페이지 위에 포커스된 내용을 엽니다.

## 예시

### 모달

열린 대화상자 안에 포커스를 유지하고 닫을 때 실행 요소로 되돌립니다.

<ComponentExample component="dialog" scenario="modal" title="모달" description="열린 대화상자 안에 포커스를 유지하고 닫을 때 실행 요소로 되돌립니다." :index="0" />

### 비모달 모달

대화상자가 열려 있어도 주변 내용을 계속 조작할 수 있습니다.

<ComponentExample component="dialog" scenario="non-modal" title="비모달 모달" description="대화상자가 열려 있어도 주변 내용을 계속 조작할 수 있습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="dialog" />

## 공개 API

Vue 패키지: `@sectile/vue/dialog`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DialogRoot</code></li>
  <li><code class="component-api-token">DialogTrigger</code></li>
  <li><code class="component-api-token">DialogPortal</code></li>
  <li><code class="component-api-token">DialogOverlay</code></li>
  <li><code class="component-api-token">DialogContent</code></li>
  <li><code class="component-api-token">DialogTitle</code></li>
  <li><code class="component-api-token">DialogDescription</code></li>
  <li><code class="component-api-token">DialogClose</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DialogRootProps</code></li>
  <li><code class="component-api-token">DialogRootSlotProps</code></li>
  <li><code class="component-api-token">DialogPartProps</code></li>
  <li><code class="component-api-token">DialogPortalProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="dialog"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">overlay</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">title</code></li>
  <li><code class="component-part-token">description</code></li>
  <li><code class="component-part-token">close</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 실행 요소나 포커스된 작업을 실행합니다. |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 사용 가능한 컨트롤 사이를 이동하며 모달 내용은 포커스를 내부에 유지합니다. |
| <kbd>Escape</kbd> | 팝업을 닫고 설정된 경우 포커스를 복원합니다. |

## 접근성

대화상자는 제목과 설명을 연결하고 모달일 때만 포커스를 가둔 뒤 닫힐 때 복원합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
