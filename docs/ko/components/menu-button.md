<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 메뉴 버튼

하나의 버튼에서 명령 메뉴를 열고 닫을 때 포커스를 복원합니다.

## 예시

### 만들기 메뉴

하나의 간결한 버튼에서 작업 공간 리소스를 만들거나 가져옵니다.

<ComponentExample component="menu-button" scenario="actions" title="만들기 메뉴" description="하나의 간결한 버튼에서 작업 공간 리소스를 만들거나 가져옵니다." :index="0" />

### 내보내기 메뉴

부가 내보내기 형식은 내보내기 하위 메뉴 안에 정리합니다.

<ComponentExample component="menu-button" scenario="nested" title="내보내기 메뉴" description="부가 내보내기 형식은 내보내기 하위 메뉴 안에 정리합니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/menu-button`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenuButtonContent</code></li>
  <li><code class="component-api-token">MenuButtonRoot</code></li>
  <li><code class="component-api-token">MenuButtonTrigger</code></li>
  <li><code class="component-api-token">MenuItem</code></li>
  <li><code class="component-api-token">MenuSeparator</code></li>
  <li><code class="component-api-token">MenuSubContent</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MenuButtonRootProps</code></li>
  <li><code class="component-api-token">MenuItemProps</code></li>
  <li><code class="component-api-token">MenuItemSlotProps</code></li>
  <li><code class="component-api-token">MenuPartProps</code></li>
  <li><code class="component-api-token">MenuRootSlotProps</code></li>
  <li><code class="component-api-token">MenuSubContentProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="menu-button"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>모든 계층의 메뉴 항목. data-level로 최상위 항목과 중첩 항목을 구분</td>
  <td><code>data-scope="menu"</code><br><code>data-level="&lt;depth&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">sub-content</code></td>
  <td><code>[data-part="sub-content"]</code></td>
  <td>상위 메뉴 항목이 소유하는 팝업 콘텐츠</td>
  <td><code>data-scope="menu"</code><br><code>data-level="&lt;depth&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><code>data-scope="menu"</code></td>
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

실행 요소가 팝업과 열림 상태를 노출하고 열린 내용은 메뉴 의미를 사용한 뒤 닫힐 때 포커스를 돌려줍니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
