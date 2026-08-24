<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 평점

순서가 있는 평점 척도에서 점수를 고치거나 지웁니다.

## 예시

### 5점 별점

5점 척도에서 점수를 고르고 다시 지울 수 있습니다.

<ComponentExample component="rating" scenario="five-star" title="5점 별점" description="5점 척도에서 점수를 고르고 다시 지울 수 있습니다." :index="0" />

### 필수 선택

항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다.

<ComponentExample component="rating" scenario="required" title="필수 선택" description="항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/rating`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RatingRoot</code></li>
  <li><code class="component-api-token">RatingItem</code></li>
  <li><code class="component-api-token">RatingIndicator</code></li>
  <li><code class="component-api-token">RatingClear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">RatingRootProps</code></li>
  <li><code class="component-api-token">RatingRootSlotProps</code></li>
  <li><code class="component-api-token">RatingClearProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="rating"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">clear</code></td>
  <td><code>[data-part="clear"]</code></td>
  <td>현재 값이나 항목 모음을 비웁니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

평점 선택은 라디오 묶음 의미를 사용하고 각 점수에 이름을 제공하며 명시적인 지우기 작업을 제공합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/radio/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
