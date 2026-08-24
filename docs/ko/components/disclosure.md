<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 상세 내용 펼치기

하나의 실행 요소로 선택적인 내용을 펼치고 접습니다.

## 예시

### 닫힌 상태

닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다.

<ComponentExample component="disclosure" scenario="closed" title="닫힌 상태" description="닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/disclosure`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DisclosureRoot</code></li>
  <li><code class="component-api-token">DisclosureTrigger</code></li>
  <li><code class="component-api-token">DisclosureContent</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DisclosureRootProps</code></li>
  <li><code class="component-api-token">DisclosureSlotProps</code></li>
  <li><code class="component-api-token">DisclosureTriggerProps</code></li>
  <li><code class="component-api-token">DisclosureContentProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="disclosure"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 연결된 내용을 펼치거나 접습니다. |
| <kbd>Tab</kbd> | 실행 요소와 주변 컨트롤 사이를 이동합니다. |

## 접근성

실행 요소가 펼침 상태와 연결된 내용의 관계를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
