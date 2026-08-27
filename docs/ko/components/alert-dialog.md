<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 확인 대화상자

되돌릴 수 없는 작업을 실행하기 전에 명확한 확인을 받습니다.

## 용법

### 파괴적 작업 확인

되돌릴 수 없는 작업은 실행 전에 명시적으로 확인합니다.

<ComponentExample component="alert-dialog" scenario="destructive" title="파괴적 작업 확인" description="되돌릴 수 없는 작업은 실행 전에 명시적으로 확인합니다." :index="0" />

### 저장하지 않은 변경

저장하지 않은 변경을 버리기 전에 확인합니다.

<ComponentExample component="alert-dialog" scenario="unsaved" title="저장하지 않은 변경" description="저장하지 않은 변경을 버리기 전에 확인합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="alert-dialog" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## 외부 조작

`closeOnInteractOutside`로 콘텐츠 밖의 포인터 조작이 컴포넌트를 닫을지 정합니다. `interactOutsideExclusions`에 넣은 요소는 모달에서도 계속 조작할 수 있고 외부 조작으로 간주하지 않습니다. 조건부로 유지하려면 `interact-outside` 이벤트에서 `preventDefault()`를 호출합니다.

```vue
<AlertDialogRoot
  :interact-outside-exclusions="[ignoredElement]"
  @interact-outside="(event) => {
    if (event.isInside(temporarilyIgnoredElement)) event.preventDefault()
  }"
/>
```

## API

Vue 패키지: `@sectile/vue/alert-dialog`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">AlertDialogRoot</code></li>
  <li><code class="component-api-token">AlertDialogTrigger</code></li>
  <li><code class="component-api-token">AlertDialogPortal</code></li>
  <li><code class="component-api-token">AlertDialogOverlay</code></li>
  <li><code class="component-api-token">AlertDialogContent</code></li>
  <li><code class="component-api-token">AlertDialogTitle</code></li>
  <li><code class="component-api-token">AlertDialogDescription</code></li>
  <li><code class="component-api-token">AlertDialogClose</code></li>
</ul>
</div>

### Props

#### `AlertDialogRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>align</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'start' | 'center' | 'end'</code></span><span><span class="component-api-definition__label">기본값</span><code>'center'</code></span></div>
<p>기준 요소를 중심으로 팝업 내용을 정렬할 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>arrowPadding</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Padding</code></span><span><span class="component-api-definition__label">기본값</span><code>8</code></span></div>
<p>화살표와 팝업 가장자리 사이에 둘 최소 간격입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>autoFocus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>열릴 때 컴포넌트 안으로 포커스를 옮길지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>autoUpdate</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean | AutoUpdateOptions</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>레이아웃 변화에 맞춰 팝업 위치를 갱신할 방법입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>avoidCollisions</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>팝업이 화면 안에 남도록 위치를 뒤집거나 이동할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>closeOnInteractOutside</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>콘텐츠 밖을 조작하면 닫을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>collisionBoundary</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Boundary</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>팝업을 화면 안에 유지할 때 사용할 경계입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>collisionPadding</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Padding</code></span><span><span class="component-api-definition__label">기본값</span><code>8</code></span></div>
<p>팝업과 충돌 경계 사이에 둘 간격입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultOpen</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>컴포넌트가 관리하는 초기 열림 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>hideWhenDetached</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>기준 요소가 레이아웃에서 벗어나면 팝업을 숨길지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>initialFocus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>HTMLElement</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컴포넌트가 열릴 때 포커스를 받을 요소 또는 요소를 반환하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>interactOutsideExclusions</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly HTMLElement[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>계속 조작할 수 있고 외부 조작으로 간주하지 않을 요소 목록입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>middleware</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Middleware[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>기본 배치 규칙 뒤에 적용할 위치 계산 미들웨어입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>open</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>restoreFocus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>열린 콘텐츠를 닫을 때 실행 요소로 포커스를 되돌릴지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>side</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'top' | 'right' | 'bottom' | 'left'</code></span><span><span class="component-api-definition__label">기본값</span><code>'bottom'</code></span></div>
<p>기준 요소를 중심으로 팝업을 우선 배치할 방향입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>sideOffset</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>8</code></span></div>
<p>팝업과 기준 요소 사이 거리입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>strategy</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Strategy</code></span><span><span class="component-api-definition__label">기본값</span><code>'absolute'</code></span></div>
<p>기준 요소에 연결된 콘텐츠의 CSS 위치 전략입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>trapFocus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>열린 콘텐츠 안에 키보드 포커스를 유지할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>unmountOnExit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>닫힘 모션이 끝난 뒤 presence 관리 콘텐츠를 DOM에서 제거할지 여부입니다.</p>
</dd>
</div>
</dl>

#### `AlertDialogPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

#### `AlertDialogPortalProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>defer</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>Teleport 대상을 현재 mount 또는 update tick이 끝날 때 찾을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>to</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | HTMLElement</code></span><span><span class="component-api-definition__label">기본값</span><code>'body'</code></span></div>
<p>포털 콘텐츠를 옮길 대상입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `AlertDialogRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>open</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `AlertDialogOpenChangeHandler`

```ts
type AlertDialogOpenChangeHandler = PopupFactoryOptions['onOpenChange']
```

#### `AlertDialogPositionChangeHandler`

```ts
type AlertDialogPositionChangeHandler = NonNullable<PopupFactoryOptions['onPositionChange']>
```

#### `AlertDialogInteractOutsideHandler`

```ts
type AlertDialogInteractOutsideHandler = NonNullable<PopupFactoryOptions['onInteractOutside']>
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="alert-dialog"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

확인 대화상자는 제목과 설명을 연결하고 모달 포커스를 내부에 유지한 뒤 닫힐 때 복원합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
