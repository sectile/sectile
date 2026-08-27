<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Tooltip

키보드 포커스나 마우스 올림으로 짧은 도움말을 표시합니다.

## 용법

### 포커스 마우스 올림

마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다.

<ComponentExample component="tooltip" scenario="focus-hover" title="포커스 마우스 올림" description="마우스를 올렸을 때와 키보드 포커스를 받았을 때 같은 도움말을 표시합니다." :index="0" />

### 처음부터 열림 상태

처음부터 열린 도움말을 실행 요소 주변에 겹쳐 표시합니다.

<ComponentExample component="tooltip" scenario="initially-open" title="처음부터 열림 상태" description="처음부터 열린 도움말을 실행 요소 주변에 겹쳐 표시합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="tooltip" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/tooltip`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TooltipRoot</code></li>
  <li><code class="component-api-token">TooltipTrigger</code></li>
  <li><code class="component-api-token">TooltipPortal</code></li>
  <li><code class="component-api-token">TooltipContent</code></li>
  <li><code class="component-api-token">TooltipArrow</code></li>
</ul>
</div>

### Props

#### `TooltipRootProps`

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
<dt><code>unmountOnExit</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>닫힘 모션이 끝난 뒤 presence 관리 콘텐츠를 DOM에서 제거할지 여부입니다.</p>
</dd>
</div>
</dl>

#### `TooltipPartProps`

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
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

#### `TooltipPortalProps`

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

#### `TooltipRootSlotProps`

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

#### `TooltipOpenChangeHandler`

```ts
type TooltipOpenChangeHandler = PopupFactoryOptions['onOpenChange']
```

#### `TooltipPositionChangeHandler`

```ts
type TooltipPositionChangeHandler = NonNullable<PopupFactoryOptions['onPositionChange']>
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tooltip"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">arrow</code></td>
  <td><code>[data-part="arrow"]</code></td>
  <td>떠 있는 콘텐츠와 기준점을 시각적으로 연결합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 실행 요소가 키보드 포커스를 받으면 도움말을 표시합니다. |
| <kbd>Escape</kbd> | 표시된 도움말을 닫습니다. |

## 접근성

도움말을 실행 요소의 설명으로 연결하고 포커스는 실행 요소에 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
