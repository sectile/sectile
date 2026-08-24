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

공통 범위: <code class="component-scope-token">[data-scope="feed"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">load-earlier</code></td>
  <td><code>[data-part="load-earlier"]</code></td>
  <td>현재 피드보다 이전 항목을 요청합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">load-newer</code></td>
  <td><code>[data-part="load-newer"]</code></td>
  <td>현재 피드보다 이후 항목을 요청합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Down</kbd> / <kbd>Page Down</kbd> | 다음 글로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Page Up</kbd> | 이전 글로 이동합니다. |
| <kbd>Tab</kbd> | 현재 글 안의 상호작용 컨트롤로 이동합니다. |

## 접근성

루트는 피드 의미를 사용하며 각 항목은 선택적인 위치와 전체 크기 정보가 있는 글로 노출됩니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
