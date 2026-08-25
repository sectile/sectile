<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 페이지 나누기

큰 결과 목록을 직접 이동 가능한 페이지와 경계 버튼으로 줄여 보여 줍니다.

## 용법

### 간결한 표시

가로 공간이 좁을 때 필요한 제어 요소만 표시합니다.

<ComponentExample component="pagination" scenario="compact" title="간결한 표시" description="가로 공간이 좁을 때 필요한 제어 요소만 표시합니다." :index="0" />

### 페이지당 항목 수

페이지당 항목 수를 바꾸고 필요하면 유효한 첫 페이지로 이동합니다.

<ComponentExample component="pagination" scenario="page-size" title="페이지당 항목 수" description="페이지당 항목 수를 바꾸고 필요하면 유효한 첫 페이지로 이동합니다." :index="1" />

### 페이지 번호만 표시

처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다.

<ComponentExample component="pagination" scenario="pages-only" title="페이지 번호만 표시" description="처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다." :index="2" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="pagination" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="3" />

## 예시

### 긴 범위

모든 페이지 번호를 늘어놓지 않고 큰 결과 목록을 이동합니다.

<ComponentExample component="pagination" scenario="long-range" title="긴 범위" description="모든 페이지 번호를 늘어놓지 않고 큰 결과 목록을 이동합니다." :index="4" />

## API

Vue 패키지: `@sectile/vue/pagination`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PaginationRoot</code></li>
  <li><code class="component-api-token">PaginationItem</code></li>
  <li><code class="component-api-token">PaginationFirst</code></li>
  <li><code class="component-api-token">PaginationPrevious</code></li>
  <li><code class="component-api-token">PaginationNext</code></li>
  <li><code class="component-api-token">PaginationLast</code></li>
</ul>
</div>

### Props

#### `PaginationRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'nav'</code></span></div>
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
<dt><code>defaultItemsPerPage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>10</code></span></div>
<p>컴포넌트가 관리하는 초기 페이지당 항목 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>1</code></span></div>
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
<dt><code>itemsPerPage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>한 페이지에 표시할 외부 제어 항목 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>'Pagination'</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
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
<dt><code>showControls</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>처음·이전·다음·마지막 이동 버튼을 포함할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>showEdges</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>true</code></span></div>
<p>첫 페이지와 마지막 페이지 번호를 항상 표시할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>siblingCount</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>1</code></span></div>
<p>현재 페이지 양옆에 표시할 페이지 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>total</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>페이지 나누기가 나타내는 전체 레코드 수입니다.</p>
</dd>
</div>
</dl>

#### `PaginationItemProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'button'</code></span></div>
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
<dt><code>item</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PaginationViewItem</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 파트가 렌더링할 페이지 항목입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `PaginationRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>items</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly PaginationViewItem[]</code></span></div>
<p>현재 계산된 항목 컬렉션입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>itemsPerPage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>현재 페이지당 레코드 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>page</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>1부터 시작하는 현재 페이지 번호입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>pageCount</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>사용 가능한 전체 페이지 수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>range</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PaginationItemRange</code></span></div>
<p>현재 시작값과 종료값입니다.</p>
</dd>
</div>
</dl>

#### `PaginationItemSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>item</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PaginationViewItem</code></span></div>
<p>현재 페이지 항목입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>selected</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 선택된 항목인지 여부입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `PaginationRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:itemsPerPage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>number</code></span></div>
<p>새 페이지당 항목 수를 요청할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>number</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `PaginationValueChangeHandler`

```ts
type PaginationValueChangeHandler = (value: number) => void
```

#### `PaginationItemsPerPageChangeHandler`

```ts
type PaginationItemsPerPageChangeHandler = (value: number) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="pagination"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">first</code></td>
  <td><code>[data-part="first"]</code></td>
  <td>첫 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous</code></td>
  <td><code>[data-part="previous"]</code></td>
  <td>이전 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next</code></td>
  <td><code>[data-part="next"]</code></td>
  <td>다음 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">last</code></td>
  <td><code>[data-part="last"]</code></td>
  <td>마지막 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 버튼이나 링크로 제공되는 페이지 이동 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 페이지나 경계 이동 컨트롤을 실행합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 터미널에서는 첫 번째 또는 마지막 페이지로 이동합니다. |

## 접근성

페이지 링크나 버튼이 기본 실행 의미를 유지하고 위치에만 의존하지 않고 현재 페이지를 식별합니다.
