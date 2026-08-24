<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 체크박스

하나의 선택 여부를 바꾸거나 일부만 선택된 부모 상태를 나타냅니다.

## 예시

### 선택 또는 해제

하나의 선택 항목을 선택 또는 해제 상태로 나타냅니다.

<ComponentExample component="checkbox" scenario="binary" title="선택 또는 해제" description="하나의 선택 항목을 선택 또는 해제 상태로 나타냅니다." :index="0" />

### 일부 선택

하위 항목이 일부만 선택된 부모 항목을 나타냅니다.

<ComponentExample component="checkbox" scenario="mixed" title="일부 선택" description="하위 항목이 일부만 선택된 부모 항목을 나타냅니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="checkbox" />

## 공개 API

Vue 패키지: `@sectile/vue/checkbox`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxRoot</code></li>
  <li><code class="component-api-token">CheckboxIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxValue</code></li>
  <li><code class="component-api-token">CheckboxRootProps</code></li>
  <li><code class="component-api-token">CheckboxSlotProps</code></li>
  <li><code class="component-api-token">CheckboxIndicatorProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="checkbox"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">indicator</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

루트는 체크박스 의미를 제공하며 일부 선택 값은 `aria-checked="mixed"`로 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
