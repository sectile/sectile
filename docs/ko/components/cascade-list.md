<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Cascade List

계층의 각 단계를 나란히 펼쳐 두고 마지막 항목을 바로 선택합니다.

## 용법

### 지역

지역·국가·도시 열을 한 화면에 펼쳐 두고 목적지를 선택합니다.

<ComponentExample component="cascade-list" scenario="location" title="지역" description="지역·국가·도시 열을 한 화면에 펼쳐 두고 목적지를 선택합니다." :index="0" />

### 비활성 항목

사용할 수 없는 가지도 계층에 보여 주고 나머지 항목 사이를 계속 이동합니다.

<ComponentExample component="cascade-list" scenario="disabled" title="비활성 항목" description="사용할 수 없는 가지도 계층에 보여 주고 나머지 항목 사이를 계속 이동합니다." :index="1" />

### 외부 상태 관리

계층 탐색은 그대로 제공하면서 선택한 목적지는 부모가 관리합니다.

<ComponentExample component="cascade-list" scenario="controlled" title="외부 상태 관리" description="계층 탐색은 그대로 제공하면서 선택한 목적지는 부모가 관리합니다." :index="2" />

### 어떤 화면에 쓰나

Cascade List는 계층의 각 단계를 나란히 펼쳐 둡니다. 지역 필터, 설정 탐색, 여러 조건을 이어서 고르는 화면처럼 앞에서 고른 값과 다음 선택지를 함께 확인해야 할 때 적합합니다. 같은 계층을 좁은 공간에 넣을 때는 Cascade Select의 실행 요소와 팝업 구성을 사용할 수 있습니다.

| 구성 | 화면 배치 | 선택 흐름 |
| --- | --- | --- |
| Cascade List | 열을 페이지 안에 계속 배치 | 가지를 고르면 다음 열이 나타나고 마지막 항목을 고르면 값이 확정됨 |
| Cascade Select | 실행 요소 아래 팝업에 열을 배치 | 팝업 안에서 같은 가지 이동과 마지막 항목 선택을 사용 |

두 컴포넌트는 같은 트리 검증, 현재 항목 이동, 비활성 항목 처리, 값 선택 규칙을 공유합니다. 표현 방식만 화면 목적에 맞게 나뉩니다.

### 상태 관리

가지 이동은 <code>highlightedValue</code>와 <code>path</code>를 바꾸고, 마지막 항목 선택은 <code>modelValue</code>를 확정합니다. <code>defaultValue</code>로 내부 상태를 시작하거나 <code>v-model</code>로 부모가 값을 관리할 수 있습니다. 열은 페이지 안에 유지되므로 Esc 키는 주변 화면의 기본 동작에 그대로 전달됩니다.

## API

Vue 패키지: `@sectile/vue/cascade-list`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CascadeListRoot</code></li>
  <li><code class="component-api-token">CascadeListValue</code></li>
  <li><code class="component-api-token">CascadeListColumn</code></li>
  <li><code class="component-api-token">CascadeListItem</code></li>
  <li><code class="component-api-token">CascadeListItemIndicator</code></li>
  <li><code class="component-api-token">CascadeListItemChevron</code></li>
</ul>
</div>

### Props

#### `CascadeListRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'div'</code></span></div>
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
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>null</code></span></div>
<p>컴포넌트가 값을 관리할 때 사용할 초깃값입니다.</p>
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
<dt><code>disabledItems</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>포커스와 선택 대상에서 제외할 항목 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>form</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컨트롤을 연결할 네이티브 form 요소의 ID입니다.</p>
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
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>name</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>네이티브 폼 제출에 사용할 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>nodes</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly CascadeListItemDefinition&lt;string&gt;[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>계층을 구성할 평면 노드 목록입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CascadeListPolicies&lt;string&gt;</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>textValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(id: string) =&gt; string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>항목 값을 검색 또는 표시 문자열로 바꾸는 함수입니다.</p>
</dd>
</div>
</dl>

#### `CascadeListColumnProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'div'</code></span></div>
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
<div class="component-api-definition">
<dt><code>depth</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>단계별 선택에서 이 열의 0부터 시작하는 깊이입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
</dl>

#### `CascadeListItemProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'div'</code></span></div>
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
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `CascadeListPartProps`

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

### 슬롯

#### `CascadeListRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>columns</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (readonly string[])[]</code></span></div>
<p>현재 표시 중인 단계별 선택 열입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlightedValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>조작 대상으로 강조된 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>path</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>현재 선택 경로입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valuePath</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>루트부터 마지막 항목까지의 현재 선택값입니다.</p>
</dd>
</div>
</dl>

#### `CascadeListColumnSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>depth</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>현재 계층 항목의 깊이입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>items</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>현재 계산된 항목 컬렉션입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>parentValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>현재 단계별 선택 열을 소유한 값입니다.</p>
</dd>
</div>
</dl>

#### `CascadeListItemSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>branch</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>이 항목이 하위 항목을 소유하는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>expanded</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>하위 항목이 보이는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlighted</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>조작 대상으로 강조된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>selected</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 선택된 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `CascadeListRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>highlight</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>강조된 항목이 바뀔 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `CascadeListTextValueResolver`

```ts
type CascadeListTextValueResolver = NonNullable<CascadeListRootProps['textValue']>
```

#### `CascadeListValueChangeHandler`

```ts
type CascadeListValueChangeHandler = (value: string | null) => void
```

#### `CascadeListHighlightHandler`

```ts
type CascadeListHighlightHandler = (value: string | null) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="cascade-list"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">value</code></td>
  <td><code>[data-part="value"]</code></td>
  <td>현재 확정 값을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">column</code></td>
  <td><code>[data-part="column"]</code></td>
  <td>계층형 선택 항목의 한 단계를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-chevron</code></td>
  <td><code>[data-part="item-chevron"]</code></td>
  <td>항목에 하위 단계가 있음을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 열에서 선택 가능한 항목 사이를 이동합니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 부모 열로 돌아가거나 현재 가지의 다음 열로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 열의 선택 가능한 첫 항목 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 가지를 펼치거나 마지막 항목을 선택합니다. |

## 접근성

화면에 보이는 계층의 각 단계는 이름이 있는 목록 상자이며 항목은 선택·가지·펼침·비활성 상태를 전달합니다.
