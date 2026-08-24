<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 피드

읽던 위치를 잃지 않고 새 활동이나 이전 기록을 불러오는 제품 활동 목록을 제공합니다.

## 예시

### 전체 릴리스 기록

하나의 릴리스에서 발생한 전체 활동 기록을 확인합니다.

<ComponentExample component="feed" scenario="finite" title="전체 릴리스 기록" description="하나의 릴리스에서 발생한 전체 활동 기록을 확인합니다." :index="0" />

### 새 활동

읽고 있던 위치를 방해하지 않고 새 배포 활동을 불러옵니다.

<ComponentExample component="feed" scenario="load-after" title="새 활동" description="읽고 있던 위치를 방해하지 않고 새 배포 활동을 불러옵니다." :index="1" />

### 이전 활동

현재 활동 순서를 유지하면서 이전 릴리스 기록을 이어 붙입니다.

<ComponentExample component="feed" scenario="load-before" title="이전 활동" description="현재 활동 순서를 유지하면서 이전 릴리스 기록을 이어 붙입니다." :index="2" />

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
