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

공통 범위: <code class="component-scope-token">[data-scope="window-splitter"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">pane</code></td>
  <td><code>[data-part="pane"]</code></td>
  <td>크기를 조절할 수 있는 영역 하나를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">handle</code></td>
  <td><code>[data-part="handle"]</code></td>
  <td>인접한 영역의 크기를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

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
