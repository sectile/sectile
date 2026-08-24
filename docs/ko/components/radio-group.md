<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 라디오 버튼 묶음

이름이 있는 선택지 묶음에서 정확히 하나를 고릅니다.

## 예시

### 세로 방향

같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다.

<ComponentExample component="radio-group" scenario="vertical" title="세로 방향" description="같은 크기 규칙을 유지하면서 세로 방향으로 영역을 조절합니다." :index="0" />

### 가로 방향 비활성 항목

사용할 수 없는 항목을 건너뛰면서 라디오 버튼 사이를 가로로 이동합니다.

<ComponentExample component="radio-group" scenario="horizontal-disabled" title="가로 방향 비활성 항목" description="사용할 수 없는 항목을 건너뛰면서 라디오 버튼 사이를 가로로 이동합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="radio-group" />

## 공개 API

Vue 패키지: `@sectile/vue/radio-group`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RadioGroupRoot</code></li>
  <li><code class="component-api-token">RadioGroupItem</code></li>
  <li><code class="component-api-token">RadioGroupIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RadioGroupRootProps</code></li>
  <li><code class="component-api-token">RadioGroupRootSlotProps</code></li>
  <li><code class="component-api-token">RadioGroupItemProps</code></li>
  <li><code class="component-api-token">RadioGroupItemSlotProps</code></li>
  <li><code class="component-api-token">RadioGroupIndicatorProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="radio-group"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">indicator</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

묶음과 각 라디오가 선택·강조·비활성 상태를 노출하고 하나의 이동 탭 위치를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
