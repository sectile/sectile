<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 피드

버전이 있는 활동 목록을 이동하고 이전·다음 항목을 요청합니다.

## 예시

### 유한 목록

이전·다음 경계가 분명한 활동 목록을 이동합니다.

<ComponentExample component="feed" scenario="finite" title="유한 목록" description="이전·다음 경계가 분명한 활동 목록을 이동합니다." :index="0" />

### 불러오기 다음 항목 불러오기

현재 표시 구간이 최신 경계에 닿으면 새 활동을 요청합니다.

<ComponentExample component="feed" scenario="load-after" title="불러오기 다음 항목 불러오기" description="현재 표시 구간이 최신 경계에 닿으면 새 활동을 요청합니다." :index="1" />

### 불러오기 이전 항목 불러오기

현재 활동 순서를 바꾸지 않고 더 오래된 항목을 요청합니다.

<ComponentExample component="feed" scenario="load-before" title="불러오기 이전 항목 불러오기" description="현재 활동 순서를 바꾸지 않고 더 오래된 항목을 요청합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="feed" />

## 공개 API

Vue 패키지: `@sectile/vue/feed`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FeedRoot</code></li>
  <li><code class="component-api-token">FeedItem</code></li>
  <li><code class="component-api-token">FeedLoadEarlier</code></li>
  <li><code class="component-api-token">FeedLoadNewer</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FeedRootProps</code></li>
  <li><code class="component-api-token">FeedRootSlotProps</code></li>
  <li><code class="component-api-token">FeedItemSlotProps</code></li>
  <li><code class="component-api-token">FeedPartProps</code></li>
  <li><code class="component-api-token">FeedDirection</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="feed"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">load-earlier</code></li>
  <li><code class="component-part-token">load-newer</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Down</kbd> / <kbd>Page Down</kbd> | 다음 글로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Page Up</kbd> | 이전 글로 이동합니다. |
| <kbd>Tab</kbd> | 현재 글 안의 상호작용 컨트롤로 이동합니다. |

## 접근성

루트는 피드 의미를 사용하며 각 항목은 선택적인 위치와 전체 크기 정보가 있는 글로 노출됩니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
