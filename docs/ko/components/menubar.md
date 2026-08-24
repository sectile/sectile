<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 메뉴 막대

최상위 메뉴 사이를 이동한 뒤 각 명령 계층을 탐색합니다.

## 예시

### 응용 프로그램 메뉴

최상위 응용 프로그램 메뉴 사이를 이동한 뒤 열린 명령 목록으로 들어갑니다.

<ComponentExample component="menubar" scenario="application" title="응용 프로그램 메뉴" description="최상위 응용 프로그램 메뉴 사이를 이동한 뒤 열린 명령 목록으로 들어갑니다." :index="0" />

### 비활성 항목 최상위

사용할 수 없는 최상위 메뉴를 건너뛰고 양옆 메뉴 사이를 이동합니다.

<ComponentExample component="menubar" scenario="disabled-root" title="비활성 항목 최상위" description="사용할 수 없는 최상위 메뉴를 건너뛰고 양옆 메뉴 사이를 이동합니다." :index="1" />

### 글자 입력으로 이동

입력한 글자로 시작하는 다음 메뉴로 이동합니다.

<ComponentExample component="menubar" scenario="typeahead" title="글자 입력으로 이동" description="입력한 글자로 시작하는 다음 메뉴로 이동합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="menubar" />

## 공개 API

Vue 패키지: `@sectile/vue/menubar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenubarItem</code></li>
  <li><code class="component-api-token">MenubarSeparator</code></li>
  <li><code class="component-api-token">MenubarContent</code></li>
  <li><code class="component-api-token">MenubarRoot</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenubarItemProps</code></li>
  <li><code class="component-api-token">MenubarItemSlotProps</code></li>
  <li><code class="component-api-token">MenubarPartProps</code></li>
  <li><code class="component-api-token">MenubarRootProps</code></li>
  <li><code class="component-api-token">MenubarRootSlotProps</code></li>
  <li><code class="component-api-token">MenubarContentProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="menubar"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">sub-content</code></li>
  <li><code class="component-part-token">separator</code></li>
</ul>

**예외와 추가 속성**

- `item`: 모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분 · `data-level="<depth>"` 추가
- `sub-content`: 상위 메뉴 항목이 소유하는 팝업 콘텐츠 · `data-scope="menu"` 사용 · `data-level="<depth>"` 추가
- `separator`: `data-scope="menu"` 사용

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 최상위 메뉴 항목 사이를 이동합니다. |
| <kbd>Arrow Down</kbd> / <kbd>Arrow Up</kbd> | 하위 메뉴를 열거나 세로 항목 목록 안에서 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 항목을 실행합니다. |
| <kbd>Escape</kbd> | 하위 메뉴를 닫고 이를 연 항목으로 돌아갑니다. |

## 접근성

루트는 메뉴 막대 의미를 제공하고 열린 가지는 계층형 메뉴 항목과 이동 포커스를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
