<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 단계 진행

진행 상태와 사용 가능 조건을 보여 주며 순서가 있는 작업을 안내합니다.

## 예시

### 결제

사용 가능한 결제 단계를 정해진 순서대로 진행합니다.

<ComponentExample component="stepper" scenario="checkout" title="결제" description="사용 가능한 결제 단계를 정해진 순서대로 진행합니다." :index="0" />

### 진행 조건 증감 간격

현재 단계의 완료 조건을 충족하기 전에는 다음 단계로 이동하지 못하게 합니다.

<ComponentExample component="stepper" scenario="gated-step" title="진행 조건 증감 간격" description="현재 단계의 완료 조건을 충족하기 전에는 다음 단계로 이동하지 못하게 합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="stepper" />

## 공개 API

Vue 패키지: `@sectile/vue/stepper`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">StepperRoot</code></li>
  <li><code class="component-api-token">StepperList</code></li>
  <li><code class="component-api-token">StepperStep</code></li>
  <li><code class="component-api-token">StepperContent</code></li>
  <li><code class="component-api-token">StepperIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">StepperRootProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="stepper"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">list</code></li>
  <li><code class="component-part-token">step</code></li>
  <li><code class="component-part-token">indicator</code></li>
  <li><code class="component-part-token">content</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 가로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 세로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 탭으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 직접 실행 모드에서 포커스된 탭을 엽니다. |

## 접근성

순서 있는 단계 목록이 현재 단계를 노출하고 각 단계 실행 요소를 내용 패널과 연결합니다.
