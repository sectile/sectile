<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도움말

키보드 포커스나 마우스 올림으로 짧은 도움말을 표시합니다.

## 예시

### 포커스 마우스 올림

마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다.

<ComponentExample component="tooltip" scenario="focus-hover" title="포커스 마우스 올림" description="마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다." :index="0" />

### 처음부터 열림 상태

처음부터 열려 있어도 실행 요소 주변 배치를 밀어내지 않습니다.

<ComponentExample component="tooltip" scenario="initially-open" title="처음부터 열림 상태" description="처음부터 열려 있어도 실행 요소 주변 배치를 밀어내지 않습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="tooltip" />

## 공개 API

Vue 패키지: `@sectile/vue/tooltip`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TooltipRoot</code></li>
  <li><code class="component-api-token">TooltipTrigger</code></li>
  <li><code class="component-api-token">TooltipPortal</code></li>
  <li><code class="component-api-token">TooltipContent</code></li>
  <li><code class="component-api-token">TooltipArrow</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TooltipRootProps</code></li>
  <li><code class="component-api-token">TooltipRootSlotProps</code></li>
  <li><code class="component-api-token">TooltipPartProps</code></li>
  <li><code class="component-api-token">TooltipPortalProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="tooltip"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">arrow</code></li>
</ul>

`provider`는 DOM 요소를 만들지 않는 상태 제공자입니다.

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 실행 요소가 키보드 포커스를 받으면 도움말을 표시합니다. |
| <kbd>Escape</kbd> | 표시된 도움말을 닫습니다. |

## 접근성

도움말을 실행 요소의 설명으로 연결하고 도움말 자체에는 포커스를 두지 않습니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
