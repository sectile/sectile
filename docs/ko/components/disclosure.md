<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 상세 내용 펼치기

하나의 실행 요소로 선택적인 내용을 펼치고 접습니다.

## 예시

### 닫힌 상태

닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다.

<ComponentExample component="disclosure" scenario="closed" title="닫힌 상태" description="닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="disclosure" />

## 공개 API

Vue 패키지: `@sectile/vue/disclosure`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DisclosureRoot</code></li>
  <li><code class="component-api-token">DisclosureTrigger</code></li>
  <li><code class="component-api-token">DisclosureContent</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DisclosureRootProps</code></li>
  <li><code class="component-api-token">DisclosureSlotProps</code></li>
  <li><code class="component-api-token">DisclosureTriggerProps</code></li>
  <li><code class="component-api-token">DisclosureContentProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="disclosure"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 연결된 내용을 펼치거나 접습니다. |
| <kbd>Tab</kbd> | 실행 요소와 주변 컨트롤 사이를 이동합니다. |

## 접근성

실행 요소가 펼침 상태와 연결된 내용의 관계를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
