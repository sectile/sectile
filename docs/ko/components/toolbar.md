<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도구 막대

관련 작업을 짧은 막대에 모아 이동하고 현재 도구를 실행합니다.

## 예시

### 가로 방향

같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다.

<ComponentExample component="toolbar" scenario="horizontal" title="가로 방향" description="같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다." :index="0" />

### 세로 방향 비활성 항목

사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다.

<ComponentExample component="toolbar" scenario="vertical-disabled" title="세로 방향 비활성 항목" description="사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="toolbar" />

## 공개 API

Vue 패키지: `@sectile/vue/toolbar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToolbarRoot</code></li>
  <li><code class="component-api-token">ToolbarItem</code></li>
  <li><code class="component-api-token">ToolbarSeparator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToolbarRootProps</code></li>
  <li><code class="component-api-token">ToolbarRootSlotProps</code></li>
  <li><code class="component-api-token">ToolbarItemProps</code></li>
  <li><code class="component-api-token">ToolbarItemSlotProps</code></li>
  <li><code class="component-api-token">ToolbarPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="toolbar"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">separator</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 설정된 방향에 따라 도구 항목 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 활성화된 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 도구를 실행합니다. |

## 접근성

이름이 있는 도구 막대가 하나의 이동 탭 위치를 사용하고 구분선을 포커스 순서에서 제외합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
