<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 스위치

즉시 반영되는 설정 하나를 켜거나 끕니다.

## 예시

### 꺼짐

꺼진 상태에서 시작해 값을 켜고 끄는 동작을 바로 확인할 수 있습니다.

<ComponentExample component="switch" scenario="off" title="꺼짐" description="꺼진 상태에서 시작해 값을 켜고 끄는 동작을 바로 확인할 수 있습니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="switch" />

## 공개 API

Vue 패키지: `@sectile/vue/switch`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SwitchRoot</code></li>
  <li><code class="component-api-token">SwitchThumb</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SwitchRootProps</code></li>
  <li><code class="component-api-token">SwitchSlotProps</code></li>
  <li><code class="component-api-token">SwitchThumbProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="switch"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">thumb</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

루트는 스위치 의미를 제공하며 선택·비활성·읽기 전용 상태를 구분합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
