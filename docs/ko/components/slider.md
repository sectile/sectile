<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 슬라이더

포인터나 키보드로 일정 간격의 숫자 하나를 조절합니다.

## 예시

### 하나만 선택 값

포인터나 키보드로 하나의 가로 값을 선택합니다.

<ComponentExample component="slider" scenario="single-value" title="하나만 선택 값" description="포인터나 키보드로 하나의 가로 값을 선택합니다." :index="0" />

### 세로 방향 값

포인터나 키보드로 하나의 세로 값을 선택합니다.

<ComponentExample component="slider" scenario="vertical-value" title="세로 방향 값" description="포인터나 키보드로 하나의 세로 값을 선택합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="slider" />

## 공개 API

Vue 패키지: `@sectile/vue/slider`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SliderRoot</code></li>
  <li><code class="component-api-token">SliderTrack</code></li>
  <li><code class="component-api-token">SliderRange</code></li>
  <li><code class="component-api-token">SliderThumb</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SliderRootProps</code></li>
  <li><code class="component-api-token">SliderSlotProps</code></li>
  <li><code class="component-api-token">SliderPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="slider"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">track</code></li>
  <li><code class="component-part-token">range</code></li>
  <li><code class="component-part-token">thumb</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Right</kbd> / <kbd>Arrow Up</kbd> | 값을 한 단계 증가시킵니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Down</kbd> | 값을 한 단계 감소시킵니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 최솟값 또는 최댓값으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 지원되는 경우 설정된 큰 단계만큼 값을 바꿉니다. |

## 접근성

핸들이 이름, 최솟값, 최댓값, 현재 값, 방향, 상호작용 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
