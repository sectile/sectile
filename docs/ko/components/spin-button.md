<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 증감 입력

숫자를 직접 입력하거나 증가·감소 버튼으로 바꿉니다.

## 예시

### 정수

정수 입력을 받고 증가·감소 제어 기능을 제공합니다.

<ComponentExample component="spin-button" scenario="integer" title="정수" description="정수 입력을 받고 증가·감소 제어 기능을 제공합니다." :index="0" />

### 잘못된 입력 중인 값

잘못 입력한 문자열은 그대로 보여 주되 마지막으로 확정된 숫자는 바꾸지 않습니다.

<ComponentExample component="spin-button" scenario="invalid-draft" title="잘못된 입력 중인 값" description="잘못 입력한 문자열은 그대로 보여 주되 마지막으로 확정된 숫자는 바꾸지 않습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="spin-button" />

## 공개 API

Vue 패키지: `@sectile/vue/spin-button`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SpinButtonRoot</code></li>
  <li><code class="component-api-token">SpinButtonInput</code></li>
  <li><code class="component-api-token">SpinButtonIncrement</code></li>
  <li><code class="component-api-token">SpinButtonDecrement</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SpinButtonRootProps</code></li>
  <li><code class="component-api-token">SpinButtonSlotProps</code></li>
  <li><code class="component-api-token">SpinButtonInputProps</code></li>
  <li><code class="component-api-token">SpinButtonTriggerProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="spin-button"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">input</code></li>
  <li><code class="component-part-token">increment</code></li>
  <li><code class="component-part-token">decrement</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Right</kbd> / <kbd>Arrow Up</kbd> | 값을 한 단계 증가시킵니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Down</kbd> | 값을 한 단계 감소시킵니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 최솟값 또는 최댓값으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 지원되는 경우 설정된 큰 단계만큼 값을 바꿉니다. |

## 접근성

입력란이 증감 입력 값 정보를 노출하고 증가·감소 요소는 이름이 있는 기본 컨트롤로 유지됩니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
