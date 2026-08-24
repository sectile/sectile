<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 아코디언

관련 내용을 각각 펼치고 접을 수 있는 여러 영역으로 구성합니다.

## 예시

### 하나만 선택

한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다.

<ComponentExample component="accordion" scenario="single" title="하나만 선택" description="한 번에 하나의 값만 활성화하고 키보드나 포인터로 이동해 선택합니다." :index="0" />

### 여러 항목 선택

기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다.

<ComponentExample component="accordion" scenario="multiple" title="여러 항목 선택" description="기존 선택을 유지하면서 여러 값을 각각 선택하거나 해제합니다." :index="1" />

### 필수 선택

항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다.

<ComponentExample component="accordion" scenario="required" title="필수 선택" description="항상 하나의 값이 선택되거나 하나의 영역이 펼쳐진 상태를 유지합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="accordion" />

## 공개 API

Vue 패키지: `@sectile/vue/accordion`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">AccordionRoot</code></li>
  <li><code class="component-api-token">AccordionItem</code></li>
  <li><code class="component-api-token">AccordionHeader</code></li>
  <li><code class="component-api-token">AccordionTrigger</code></li>
  <li><code class="component-api-token">AccordionContent</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">AccordionType</code></li>
  <li><code class="component-api-token">AccordionValue</code></li>
  <li><code class="component-api-token">AccordionRootProps</code></li>
  <li><code class="component-api-token">AccordionRootSlotProps</code></li>
  <li><code class="component-api-token">AccordionItemProps</code></li>
  <li><code class="component-api-token">AccordionItemSlotProps</code></li>
  <li><code class="component-api-token">AccordionPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="accordion"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">header</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">content</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 절을 펼치거나 접습니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 절 실행 요소 사이에서 포커스를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 절 실행 요소로 이동합니다. |

## 접근성

절 실행 요소가 펼침 상태와 연결된 내용 영역을 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
