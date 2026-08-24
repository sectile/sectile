<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 확인 대화상자

되돌릴 수 없는 작업을 실행하기 전에 명확한 확인을 받습니다.

## 예시

### 프로젝트 삭제

되돌릴 수 없는 작업은 실행 전에 명시적으로 확인합니다.

<ComponentExample component="alert-dialog" scenario="destructive" title="프로젝트 삭제" description="되돌릴 수 없는 작업은 실행 전에 명시적으로 확인합니다." :index="0" />

### 저장하지 않은 변경

저장하지 않은 변경을 버리기 전에 확인합니다.

<ComponentExample component="alert-dialog" scenario="unsaved" title="저장하지 않은 변경" description="저장하지 않은 변경을 버리기 전에 확인합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="alert-dialog" />

## 공개 API

Vue 패키지: `@sectile/vue/alert-dialog`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">AlertDialogRoot</code></li>
  <li><code class="component-api-token">AlertDialogTrigger</code></li>
  <li><code class="component-api-token">AlertDialogPortal</code></li>
  <li><code class="component-api-token">AlertDialogOverlay</code></li>
  <li><code class="component-api-token">AlertDialogContent</code></li>
  <li><code class="component-api-token">AlertDialogTitle</code></li>
  <li><code class="component-api-token">AlertDialogDescription</code></li>
  <li><code class="component-api-token">AlertDialogClose</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">AlertDialogRootProps</code></li>
  <li><code class="component-api-token">AlertDialogRootSlotProps</code></li>
  <li><code class="component-api-token">AlertDialogPartProps</code></li>
  <li><code class="component-api-token">AlertDialogPortalProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="alert-dialog"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

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

확인 대화상자는 제목과 설명을 연결하고 모달 포커스를 내부에 유지한 뒤 닫힐 때 복원합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
