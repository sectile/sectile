<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 메뉴

계층형 명령을 이동하고 하위 메뉴를 열어 작업을 실행합니다.

## 예시

### 프로젝트 명령

자주 쓰는 프로젝트 명령을 하나의 단일 메뉴에서 실행합니다.

<ComponentExample component="menu" scenario="commands" title="프로젝트 명령" description="자주 쓰는 프로젝트 명령을 하나의 단일 메뉴에서 실행합니다." :index="0" />

### 내보내기 형식

내보내기 명령이 소유한 하위 메뉴에서 파일 형식을 선택합니다.

<ComponentExample component="menu" scenario="nested" title="내보내기 형식" description="내보내기 명령이 소유한 하위 메뉴에서 파일 형식을 선택합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="menu" />

## 공개 API

Vue 패키지: `@sectile/vue/menu`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenuRoot</code></li>
  <li><code class="component-api-token">MenubarRoot</code></li>
  <li><code class="component-api-token">NavigationMenuRoot</code></li>
  <li><code class="component-api-token">MenuButtonRoot</code></li>
  <li><code class="component-api-token">MenuButtonTrigger</code></li>
  <li><code class="component-api-token">MenuButtonContent</code></li>
  <li><code class="component-api-token">MenuItem</code></li>
  <li><code class="component-api-token">MenuSubContent</code></li>
  <li><code class="component-api-token">MenuSeparator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenuRootProps</code></li>
  <li><code class="component-api-token">MenuButtonRootProps</code></li>
  <li><code class="component-api-token">MenuRootSlotProps</code></li>
  <li><code class="component-api-token">MenuItemProps</code></li>
  <li><code class="component-api-token">MenuItemSlotProps</code></li>
  <li><code class="component-api-token">MenuSubContentProps</code></li>
  <li><code class="component-api-token">MenuPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="menu"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">sub-content</code></li>
  <li><code class="component-part-token">separator</code></li>
</ul>

**예외와 추가 속성**

- `item`: 모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분 · `data-level="<depth>"` 추가
- `sub-content`: 상위 메뉴 항목이 소유하는 팝업 콘텐츠 · `data-level="<depth>"` 추가

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 메뉴 단계의 항목 사이를 이동합니다. |
| <kbd>Arrow Right</kbd> / <kbd>Arrow Left</kbd> | 하위 메뉴를 열거나 상위 메뉴로 돌아갑니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 항목을 실행합니다. |
| <kbd>Escape</kbd> | 현재 메뉴 단계를 닫습니다. |

## 접근성

메뉴 항목, 구분선, 하위 메뉴 상태가 계층형 메뉴 의미와 이동 포커스를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
