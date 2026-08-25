<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 메뉴 막대

최상위 메뉴 사이를 이동한 뒤 각 명령 계층을 탐색합니다.

## 용법

### 응용 프로그램 메뉴

최상위 응용 프로그램 메뉴 사이를 이동한 뒤 열린 명령 목록으로 들어갑니다.

<ComponentExample component="menubar" scenario="application" title="응용 프로그램 메뉴" description="최상위 응용 프로그램 메뉴 사이를 이동한 뒤 열린 명령 목록으로 들어갑니다." :index="0" />

### 비활성 항목 최상위

사용할 수 없는 최상위 메뉴를 건너뛰고 양옆 메뉴 사이를 이동합니다.

<ComponentExample component="menubar" scenario="disabled-root" title="비활성 항목 최상위" description="사용할 수 없는 최상위 메뉴를 건너뛰고 양옆 메뉴 사이를 이동합니다." :index="1" />

### 글자 입력으로 이동

입력한 글자로 시작하는 다음 메뉴로 이동합니다.

<ComponentExample component="menubar" scenario="typeahead" title="글자 입력으로 이동" description="입력한 글자로 시작하는 다음 메뉴로 이동합니다." :index="2" />

## API

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

### Props

#### `MenubarItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `undefined` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `MenubarPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `MenubarRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly MenuItemDefinition<string>[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `defaultHighlightedValue` | `string \| null` | `undefined` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `disabledItems` | `readonly string[]` | `undefined` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `undefined` | 사용자 조작을 막을지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `MenuPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `textValue` | `(id: string) => string` | `undefined` | 항목 값을 검색 또는 표시 문자열로 바꾸는 함수입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `MenubarContentProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `for` | `string` | 필수 | 이 컴포넌트가 연결할 관련 파트의 값 또는 ID입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `MenubarItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |

#### `MenubarRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `openPath` | `readonly string[]` | 열린 메뉴 경로의 순서 있는 값입니다. |

### 이벤트

#### `MenubarRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |
| `invoke` | `string` | 현재 작업을 실행할 때 발생합니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="menubar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 최상위 메뉴 항목 사이를 이동합니다. |
| <kbd>Arrow Down</kbd> / <kbd>Arrow Up</kbd> | 하위 메뉴를 열거나 세로 항목 목록 안에서 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 단계의 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 항목을 실행합니다. |
| <kbd>Escape</kbd> | 하위 메뉴를 닫고 이를 연 항목으로 돌아갑니다. |

## 접근성

루트는 메뉴 막대 의미를 제공하고 열린 가지는 계층형 메뉴 항목과 이동 포커스를 사용합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
