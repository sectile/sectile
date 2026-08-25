<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 대화상자

모달 또는 비모달 방식으로 페이지 위에 포커스된 내용을 엽니다.

## 용법

### 모달

열린 대화상자 안에 포커스를 유지하고 닫을 때 실행 요소로 되돌립니다.

<ComponentExample component="dialog" scenario="modal" title="모달" description="열린 대화상자 안에 포커스를 유지하고 닫을 때 실행 요소로 되돌립니다." :index="0" />

### 비모달 모달

대화상자가 열려 있어도 주변 내용을 계속 조작할 수 있습니다.

<ComponentExample component="dialog" scenario="non-modal" title="비모달 모달" description="대화상자가 열려 있어도 주변 내용을 계속 조작할 수 있습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="dialog" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/dialog`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DialogRoot</code></li>
  <li><code class="component-api-token">DialogTrigger</code></li>
  <li><code class="component-api-token">DialogPortal</code></li>
  <li><code class="component-api-token">DialogOverlay</code></li>
  <li><code class="component-api-token">DialogContent</code></li>
  <li><code class="component-api-token">DialogTitle</code></li>
  <li><code class="component-api-token">DialogDescription</code></li>
  <li><code class="component-api-token">DialogClose</code></li>
</ul>
</div>

### Props

#### `DialogRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | 기준 요소를 중심으로 팝업을 우선 배치할 방향입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `align` | `'start' \| 'center' \| 'end'` | `'center'` | 기준 요소를 중심으로 팝업 내용을 정렬할 위치입니다. |
| `sideOffset` | `number` | `8` | 팝업과 기준 요소 사이 거리입니다. |
| `arrowPadding` | `Padding` | `8` | 화살표와 팝업 가장자리 사이에 둘 최소 간격입니다. |
| `autoFocus` | `boolean` | `true` | 열릴 때 컴포넌트 안으로 포커스를 옮길지 여부입니다. |
| `autoUpdate` | `boolean \| AutoUpdateOptions` | `undefined` | 레이아웃 변화에 맞춰 팝업 위치를 갱신할 방법입니다. |
| `avoidCollisions` | `boolean` | `true` | 팝업이 화면 안에 남도록 위치를 뒤집거나 이동할지 여부입니다. |
| `closeOnInteractOutside` | `boolean` | `false` | 콘텐츠 밖을 조작하면 닫을지 여부입니다. |
| `collisionBoundary` | `Boundary` | `undefined` | 팝업을 화면 안에 유지할 때 사용할 경계입니다. |
| `collisionPadding` | `Padding` | `8` | 팝업과 충돌 경계 사이에 둘 간격입니다. |
| `hideWhenDetached` | `boolean` | `true` | 기준 요소가 레이아웃에서 벗어나면 팝업을 숨길지 여부입니다. |
| `middleware` | `Middleware[]` | `undefined` | 기본 배치 규칙 뒤에 적용할 위치 계산 미들웨어입니다. |
| `restoreFocus` | `boolean` | `true` | 열린 콘텐츠를 닫을 때 실행 요소로 포커스를 되돌릴지 여부입니다. |
| `strategy` | `Strategy` | `'fixed'` | 기준 요소에 연결된 콘텐츠의 CSS 위치 전략입니다. |
| `trapFocus` | `boolean` | `true` | 열린 콘텐츠 안에 키보드 포커스를 유지할지 여부입니다. |
| `modal` | `boolean` | `true` | 열린 콘텐츠가 주변 페이지 조작을 막을지 여부입니다. |

#### `DialogPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `DialogPortalProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `to` | `string \| HTMLElement` | `'body'` | 포털 콘텐츠를 옮길 대상입니다. |

### 슬롯

#### `DialogRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="dialog"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">overlay</code></td>
  <td><code>[data-part="overlay"]</code></td>
  <td>모달이 열린 동안 주변 콘텐츠를 덮습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">title</code></td>
  <td><code>[data-part="title"]</code></td>
  <td>연결된 콘텐츠의 제목을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">close</code></td>
  <td><code>[data-part="close"]</code></td>
  <td>현재 화면을 닫거나 해제합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 실행 요소나 포커스된 작업을 실행합니다. |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 사용 가능한 컨트롤 사이를 이동하며 모달 내용은 포커스를 내부에 유지합니다. |
| <kbd>Escape</kbd> | 팝업을 닫고 설정된 경우 포커스를 복원합니다. |

## 접근성

대화상자는 제목과 설명을 연결하고 모달일 때만 포커스를 가둔 뒤 닫힐 때 복원합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
