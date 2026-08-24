<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 다중 슬라이더

하나의 수치 트랙에서 순서가 있는 여러 값을 조절합니다.

## 예시

### 핸들 두 개로 고르는 범위

핸들 두 개로 범위의 최솟값과 최댓값을 고릅니다.

<ComponentExample component="multi-thumb-slider" scenario="two-thumb-range" title="핸들 두 개로 고르는 범위" description="핸들 두 개로 범위의 최솟값과 최댓값을 고릅니다." :index="0" />

### 핸들 세 개로 나누는 구간

핸들 세 개로 하나의 수치 범위를 의미 있는 구간으로 나눕니다.

<ComponentExample component="multi-thumb-slider" scenario="three-thumb-thresholds" title="핸들 세 개로 나누는 구간" description="핸들 세 개로 하나의 수치 범위를 의미 있는 구간으로 나눕니다." :index="1" />

### 핸들 교차 여러 핸들

설정한 규칙에 따라 핸들이 서로 지나가지 못하게 하거나 값의 순서를 정리합니다.

<ComponentExample component="multi-thumb-slider" scenario="crossing-thumbs" title="핸들 교차 여러 핸들" description="설정한 규칙에 따라 핸들이 서로 지나가지 못하게 하거나 값의 순서를 정리합니다." :index="2" />

## 공개 API

Vue 패키지: `@sectile/vue/multi-thumb-slider`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MultiThumbSliderRoot</code></li>
  <li><code class="component-api-token">MultiThumbSliderTrack</code></li>
  <li><code class="component-api-token">MultiThumbSliderRange</code></li>
  <li><code class="component-api-token">MultiThumbSliderThumb</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MultiThumbSliderRootProps</code></li>
  <li><code class="component-api-token">MultiThumbSliderRootSlotProps</code></li>
  <li><code class="component-api-token">MultiThumbSliderThumbProps</code></li>
  <li><code class="component-api-token">MultiThumbSliderThumbSlotProps</code></li>
  <li><code class="component-api-token">MultiThumbSliderPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="multi-thumb-slider"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>하나 이상의 핸들이 이동하는 측정 경로입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">range</code></td>
  <td><code>[data-part="range"]</code></td>
  <td>트랙 위의 활성 범위를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">thumb</code></td>
  <td><code>[data-part="thumb"]</code></td>
  <td>트랙 위의 값 하나를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Right</kbd> / <kbd>Arrow Up</kbd> | 값을 한 단계 증가시킵니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Down</kbd> | 값을 한 단계 감소시킵니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 최솟값 또는 최댓값으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 지원되는 경우 설정된 큰 단계만큼 값을 바꿉니다. |

## 접근성

각 핸들에 독립적인 이름을 제공하고 최솟값·최댓값·현재 값·방향을 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
