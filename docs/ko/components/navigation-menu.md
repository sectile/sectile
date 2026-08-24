<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 이동 메뉴

기본 링크와 펼쳐지는 이동 패널을 하나의 막대에 구성합니다.

## 예시

### 제품 이동 메뉴

제품 링크와 하위 메뉴 실행 요소를 하나의 이동 영역에 배치합니다.

<ComponentExample component="navigation-menu" scenario="product" title="제품 이동 메뉴" description="제품 링크와 하위 메뉴 실행 요소를 하나의 이동 영역에 배치합니다." :index="0" />

### 링크 이동

복합 메뉴 실행 요소와 함께 써도 링크의 기본 이동 동작을 유지합니다.

<ComponentExample component="navigation-menu" scenario="links" title="링크 이동" description="복합 메뉴 실행 요소와 함께 써도 링크의 기본 이동 동작을 유지합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="navigation-menu" />

## 공개 API

Vue 패키지: `@sectile/vue/navigation-menu`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">NavigationMenuList</code></li>
  <li><code class="component-api-token">NavigationMenuItem</code></li>
  <li><code class="component-api-token">NavigationMenuViewport</code></li>
  <li><code class="component-api-token">NavigationMenuIndicator</code></li>
  <li><code class="component-api-token">NavigationMenuRoot</code></li>
  <li><code class="component-api-token">NavigationMenuLink</code></li>
  <li><code class="component-api-token">NavigationMenuTrigger</code></li>
  <li><code class="component-api-token">NavigationMenuContent</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">NavigationMenuItemProps</code></li>
  <li><code class="component-api-token">NavigationMenuItemSlotProps</code></li>
  <li><code class="component-api-token">NavigationMenuRootProps</code></li>
  <li><code class="component-api-token">NavigationMenuRootSlotProps</code></li>
  <li><code class="component-api-token">NavigationMenuContentProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="navigation-menu"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">list</code></li>
  <li><code class="component-part-token">item-container</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">sub-content</code></li>
  <li><code class="component-part-token">viewport</code></li>
  <li><code class="component-part-token">indicator</code></li>
</ul>

**예외와 추가 속성**

- `item`: 모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분 · `data-level="<depth>"` 추가
- `sub-content`: 상위 메뉴 항목이 소유하는 팝업 콘텐츠 · `data-level="<depth>"` 추가

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 최상위 메뉴 항목 사이를 이동합니다. |
| <kbd>Arrow Down</kbd> / <kbd>Arrow Up</kbd> | 하위 메뉴를 열거나 세로 항목 목록 안에서 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 항목을 실행합니다. |
| <kbd>Escape</kbd> | 하위 메뉴를 닫고 이를 연 항목으로 돌아갑니다. |

## 접근성

기본 링크 의미를 유지하고 펼침 실행 요소가 복합 패널의 열림 상태를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
