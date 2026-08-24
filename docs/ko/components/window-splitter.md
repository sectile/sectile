<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 영역 크기 조절

키보드로도 조작할 수 있는 구분선으로 인접 영역의 크기를 바꿉니다.

## 예시

### 가로 방향

같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다.

<ComponentExample component="window-splitter" scenario="horizontal" title="가로 방향" description="같은 값과 경계 규칙을 유지하면서 가로 방향으로 조작합니다." :index="0" />

### 세로 방향

같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다.

<ComponentExample component="window-splitter" scenario="vertical" title="세로 방향" description="같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다." :index="1" />

### 혼합 레이아웃

크기를 조절할 수 있는 사이드바 안쪽에 편집기와 미리보기 영역을 다시 나눕니다.

<ComponentExample component="window-splitter" scenario="nested-layout" title="혼합 레이아웃" description="크기를 조절할 수 있는 사이드바 안쪽에 편집기와 미리보기 영역을 다시 나눕니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="window-splitter" />

## 공개 API

Vue 패키지: `@sectile/vue/window-splitter`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">WindowSplitterRoot</code></li>
  <li><code class="component-api-token">WindowSplitterPane</code></li>
  <li><code class="component-api-token">WindowSplitterHandle</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">WindowSplitterRootProps</code></li>
  <li><code class="component-api-token">WindowSplitterPaneProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="window-splitter"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">pane</code></li>
  <li><code class="component-part-token">handle</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 좌우 배치에서 앞쪽 영역을 한 단계 줄이거나 늘립니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 상하 배치에서 앞쪽 영역을 한 단계 줄이거나 늘립니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 구분선을 허용된 최소 또는 최대 경계로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 설정된 큰 단계만큼 영역 크기를 바꿉니다. |

## 접근성

핸들이 구분선 방향과 현재·최소·최대 영역 크기를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
