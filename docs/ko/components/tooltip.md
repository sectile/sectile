<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도움말

키보드 포커스나 마우스 올림으로 짧은 도움말을 표시합니다.

## 예시

### 포커스 마우스 올림

마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다.

<ComponentExample component="tooltip" scenario="focus-hover" title="포커스 마우스 올림" description="마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다." :index="0" />

### 처음부터 열림 상태

처음부터 열려 있어도 실행 요소 주변 배치를 밀어내지 않습니다.

<ComponentExample component="tooltip" scenario="initially-open" title="처음부터 열림 상태" description="처음부터 열려 있어도 실행 요소 주변 배치를 밀어내지 않습니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/tooltip`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TooltipRoot</code></li>
  <li><code class="component-api-token">TooltipTrigger</code></li>
  <li><code class="component-api-token">TooltipPortal</code></li>
  <li><code class="component-api-token">TooltipContent</code></li>
  <li><code class="component-api-token">TooltipArrow</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TooltipRootProps</code></li>
  <li><code class="component-api-token">TooltipRootSlotProps</code></li>
  <li><code class="component-api-token">TooltipPartProps</code></li>
  <li><code class="component-api-token">TooltipPortalProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tooltip"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">arrow</code></td>
  <td><code>[data-part="arrow"]</code></td>
  <td>떠 있는 콘텐츠와 기준점을 시각적으로 연결합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 실행 요소가 키보드 포커스를 받으면 도움말을 표시합니다. |
| <kbd>Escape</kbd> | 표시된 도움말을 닫습니다. |

## 접근성

도움말을 실행 요소의 설명으로 연결하고 도움말 자체에는 포커스를 두지 않습니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
