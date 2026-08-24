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

공통 범위: <code class="component-scope-token">[data-scope="menu"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td>모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분</td>
  <td><code>data-level="&lt;depth&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">sub-content</code></td>
  <td><code>[data-part="sub-content"]</code></td>
  <td>상위 메뉴 항목이 소유하는 팝업 콘텐츠</td>
  <td><code>data-level="&lt;depth&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

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
