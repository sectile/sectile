<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도구 막대

관련 작업을 짧은 막대에 모아 이동하고 현재 도구를 실행합니다.

## 예시

### 텍스트 서식

인라인 텍스트 서식 작업을 자연스러운 가로 순서로 묶습니다.

<ComponentExample component="toolbar" scenario="formatting" title="텍스트 서식" description="인라인 텍스트 서식 작업을 자연스러운 가로 순서로 묶습니다." :index="0" />

### 캔버스 도구

편집 화면 옆에 캔버스 도구를 세로로 배치합니다.

<ComponentExample component="toolbar" scenario="vertical" title="캔버스 도구" description="편집 화면 옆에 캔버스 도구를 세로로 배치합니다." :index="1" />

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

공통 범위: <code class="component-scope-token">[data-scope="toolbar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 설정된 방향에 따라 도구 항목 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 활성화된 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 도구를 실행합니다. |

## 접근성

이름이 있는 도구 막대가 하나의 이동 탭 위치를 사용하고 구분선을 포커스 순서에서 제외합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
