<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 인증 번호 입력

여러 한 글자 입력 칸을 연결해 짧은 인증 번호를 입력합니다.

## 예시

### 인증 번호 번호

짧은 숫자 인증 번호를 한 칸씩 입력합니다.

<ComponentExample component="pin-input" scenario="verification-code" title="인증 번호 번호" description="짧은 숫자 인증 번호를 한 칸씩 입력합니다." :index="0" />

### 미리 입력된 값

완성된 값에서 시작하고 각 입력 칸을 따로 바꿀 수 있습니다.

<ComponentExample component="pin-input" scenario="prefilled" title="미리 입력된 값" description="완성된 값에서 시작하고 각 입력 칸을 따로 바꿀 수 있습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="pin-input" />

## 공개 API

Vue 패키지: `@sectile/vue/pin-input`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PinInputRoot</code></li>
  <li><code class="component-api-token">PinInputInput</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PinInputRootProps</code></li>
  <li><code class="component-api-token">PinInputRootSlotProps</code></li>
  <li><code class="component-api-token">PinInputInputProps</code></li>
  <li><code class="component-api-token">PinInputInputSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="pin-input"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">input</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 숫자 입력란 사이를 이동합니다. |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | 숫자를 지우고 기대되는 커서 이동을 유지합니다. |
| <kbd>Text input</kbd> | 올바른 문자를 받고 입력이 끝나면 다음 칸으로 이동합니다. |

## 접근성

각 숫자 입력에 독립적인 이름을 제공하고 예측 가능한 포커스 순서를 유지합니다.
