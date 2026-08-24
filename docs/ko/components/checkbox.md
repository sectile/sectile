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

공통 범위: <code class="component-scope-token">[data-scope="checkbox"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

루트는 체크박스 의미를 제공하며 일부 선택 값은 `aria-checked="mixed"`로 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
