<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 회전 목록

이전·다음·직접 이동 제어로 연속된 슬라이드를 탐색합니다.

## 예시

### 순환 이동

마지막 슬라이드 다음에는 첫 슬라이드로, 첫 슬라이드 이전에는 마지막으로 이동합니다.

<ComponentExample component="carousel" scenario="wrapping" title="순환 이동" description="마지막 슬라이드 다음에는 첫 슬라이드로, 첫 슬라이드 이전에는 마지막으로 이동합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="carousel" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

### 일시 정지

자동 이동을 멈춘 상태에서도 직접 이전·다음 항목으로 이동할 수 있습니다.

<ComponentExample component="carousel" scenario="paused" title="일시 정지" description="자동 이동을 멈춘 상태에서도 직접 이전·다음 항목으로 이동할 수 있습니다." :index="2" />

## 공개 API

Vue 패키지: `@sectile/vue/carousel`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CarouselRoot</code></li>
  <li><code class="component-api-token">CarouselViewport</code></li>
  <li><code class="component-api-token">CarouselTrack</code></li>
  <li><code class="component-api-token">CarouselIndicatorGroup</code></li>
  <li><code class="component-api-token">CarouselPrevious</code></li>
  <li><code class="component-api-token">CarouselNext</code></li>
  <li><code class="component-api-token">CarouselPause</code></li>
  <li><code class="component-api-token">CarouselSlide</code></li>
  <li><code class="component-api-token">CarouselIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CarouselRootProps</code></li>
  <li><code class="component-api-token">CarouselRootSlotProps</code></li>
  <li><code class="component-api-token">CarouselSlideSlotProps</code></li>
  <li><code class="component-api-token">CarouselPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="carousel"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">viewport</code></td>
  <td><code>[data-part="viewport"]</code></td>
  <td>현재 보이는 콘텐츠를 배치하고 경계를 정합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>하나 이상의 핸들이 이동하는 측정 경로입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">slide</code></td>
  <td><code>[data-part="slide"]</code></td>
  <td>캐러셀 페이지 하나를 나타냅니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous</code></td>
  <td><code>[data-part="previous"]</code></td>
  <td>이전 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next</code></td>
  <td><code>[data-part="next"]</code></td>
  <td>다음 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">pause</code></td>
  <td><code>[data-part="pause"]</code></td>
  <td>자동 이동을 일시 정지하거나 다시 시작합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator-group</code></td>
  <td><code>[data-part="indicator-group"]</code></td>
  <td>직접 위치 이동 조작부를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 이전 또는 다음 슬라이드로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 슬라이드로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 기본 이전·다음·일시 정지·표시 컨트롤을 실행합니다. |

## 접근성

슬라이드, 이동 버튼, 일시 정지 버튼, 표시 항목을 각각 이름이 있고 조작 가능한 요소로 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
