<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 드로어

화면 가장자리에서 내용을 열고 바깥 방향 스와이프로 닫습니다.

## 용법

### bottom

아래쪽 가장자리에서 모달 화면을 열고 핸들을 아래로 끌어 닫습니다.

<ComponentExample component="drawer" scenario="bottom" title="bottom" description="아래쪽 가장자리에서 모달 화면을 열고 핸들을 아래로 끌어 닫습니다." :index="0" />

### side

같은 드로어 계약을 화면의 가로 가장자리에서 엽니다.

<ComponentExample component="drawer" scenario="side" title="side" description="같은 드로어 계약을 화면의 가로 가장자리에서 엽니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="drawer" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## 외부 조작

`closeOnInteractOutside`로 콘텐츠 밖의 포인터 조작이 컴포넌트를 닫을지 정합니다. `interactOutsideExclusions`에 넣은 요소는 모달에서도 계속 조작할 수 있고 외부 조작으로 간주하지 않습니다. 조건부로 유지하려면 `interact-outside` 이벤트에서 `preventDefault()`를 호출합니다.

```vue
<DrawerRoot
  :interact-outside-exclusions="[ignoredElement]"
  @interact-outside="(event) => {
    if (event.isInside(temporarilyIgnoredElement)) event.preventDefault()
  }"
/>
```

## 스와이프 동작

`DrawerHandle`을 드로어의 바깥 방향으로 끌면 닫힙니다. 폼 컨트롤처럼 드래그를 시작하면 안 되는 하위 요소에는 `data-sectile-drawer-swipe-ignore`를 지정합니다. `data-swipe="move|cancel|end"`, `data-swiping`, `--sectile-drawer-swipe-movement-x`, `--sectile-drawer-swipe-movement-y`, `--sectile-drawer-swipe-progress`로 이동과 종료 애니메이션을 스타일링할 수 있습니다.

## API

Vue 패키지: `@sectile/vue/drawer`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DrawerRoot</code></li>
  <li><code class="component-api-token">DrawerTrigger</code></li>
  <li><code class="component-api-token">DrawerPortal</code></li>
  <li><code class="component-api-token">DrawerOverlay</code></li>
  <li><code class="component-api-token">DrawerContent</code></li>
  <li><code class="component-api-token">DrawerHandle</code></li>
  <li><code class="component-api-token">DrawerTitle</code></li>
  <li><code class="component-api-token">DrawerDescription</code></li>
  <li><code class="component-api-token">DrawerClose</code></li>
</ul>
</div>

### Props

#### `DrawerRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>autoFocus</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>열릴 때 컴포넌트 안으로 포커스를 옮길지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>closeOnInteractOutside</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>콘텐츠 밖을 조작하면 닫을지 여부입니다.</p>
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
<dt><code>modal</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>열린 콘텐츠가 주변 페이지 조작을 막을지 여부입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>DrawerSide</code></span><span><span class="component-api-definition__label">기본값</span><code>'bottom'</code></span></div>
<p>드로어가 열릴 화면 가장자리입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>swipeThreshold</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>80</code></span></div>
<p>밀어서 닫을 때 필요한 포인터 이동 거리(픽셀)입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>swipeToDismiss</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>바깥 방향 포인터 스와이프로 드로어를 닫을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>swipeVelocityThreshold</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>0.5</code></span></div>
<p>드로어를 닫는 바깥 방향 드래그 속도 기준값(px/ms)입니다.</p>
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

#### `DrawerPartProps`

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

#### `DrawerPortalProps`

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

#### `DrawerRootSlotProps`

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

#### `DrawerOpenChangeHandler`

```ts
type DrawerOpenChangeHandler = PopupFactoryOptions['onOpenChange']
```

#### `DrawerInteractOutsideHandler`

```ts
type DrawerInteractOutsideHandler = NonNullable<PopupFactoryOptions['onInteractOutside']>
```

#### `DrawerSide`

```ts
type DrawerSide = 'top' | 'right' | 'bottom' | 'left'
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="drawer"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">handle</code></td>
  <td><code>[data-part="handle"]</code></td>
  <td>바깥 방향 스와이프로 닫는 조작 영역을 제공합니다.</td>
  <td><code>aria-hidden="true"</code></td>
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
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 모달 포커스를 내부에 유지하며 컨트롤 사이를 이동합니다. |
| <kbd>Escape</kbd> | 드로어를 닫고 설정된 경우 포커스를 복원합니다. |
| <kbd>Pointer swipe</kbd> | 핸들을 바깥 방향으로 거리 또는 속도 기준 이상 밀어 닫습니다. |

## 접근성

드로어는 모달 대화상자 의미를 따르고 가장자리와 스와이프 방향을 노출하며 제스처 핸들은 보조 기술에서 숨깁니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
