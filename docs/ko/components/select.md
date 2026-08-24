<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 선택 상자

실행 요소가 여는 팝업 목록에서 값 하나를 고릅니다.

## 예시

### 실행 환경 선택

팝업 목록에서 하나의 배포 환경을 고릅니다.

<ComponentExample component="select" scenario="environment" title="실행 환경 선택" description="팝업 목록에서 하나의 배포 환경을 고릅니다." :index="0" />

### 비활성 항목 선택 항목

사용할 수 없는 항목을 표시하면서 포커스와 선택 대상에서는 제외합니다.

<ComponentExample component="select" scenario="disabled-option" title="비활성 항목 선택 항목" description="사용할 수 없는 항목을 표시하면서 포커스와 선택 대상에서는 제외합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="select" />

## 공개 API

Vue 패키지: `@sectile/vue/select`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SelectRoot</code></li>
  <li><code class="component-api-token">SelectTrigger</code></li>
  <li><code class="component-api-token">SelectValue</code></li>
  <li><code class="component-api-token">SelectContent</code></li>
  <li><code class="component-api-token">SelectItem</code></li>
  <li><code class="component-api-token">SelectItemIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SelectRootProps</code></li>
  <li><code class="component-api-token">SelectRootSlotProps</code></li>
  <li><code class="component-api-token">SelectItemProps</code></li>
  <li><code class="component-api-token">SelectItemSlotProps</code></li>
  <li><code class="component-api-token">SelectPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="select"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">value</code></li>
  <li><code class="component-part-token">content</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">item-indicator</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

실행 요소가 열림 상태를 노출하고 팝업 목록 상자가 선택·강조·비활성 항목을 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
