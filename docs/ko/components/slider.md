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

공통 범위: <code class="component-scope-token">[data-scope="slider"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

핸들이 이름, 최솟값, 최댓값, 현재 값, 방향, 상호작용 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
