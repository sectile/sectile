<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 선택 상자

실행 요소가 여는 팝업 목록에서 값 하나를 고릅니다.

## 용법

### 실행 환경 선택

팝업 목록에서 하나의 배포 환경을 고릅니다.

<ComponentExample component="select" scenario="environment" title="실행 환경 선택" description="팝업 목록에서 하나의 배포 환경을 고릅니다." :index="0" />

### 비활성 항목 선택 항목

사용할 수 없는 항목을 표시하면서 포커스와 선택 대상에서는 제외합니다.

<ComponentExample component="select" scenario="disabled-option" title="비활성 항목 선택 항목" description="사용할 수 없는 항목을 표시하면서 포커스와 선택 대상에서는 제외합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="select" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/select`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SelectRoot</code></li>
  <li><code class="component-api-token">SelectTrigger</code></li>
  <li><code class="component-api-token">SelectValue</code></li>
  <li><code class="component-api-token">SelectContent</code></li>
  <li><code class="component-api-token">SelectItem</code></li>
  <li><code class="component-api-token">SelectItemIndicator</code></li>
  <li><code class="component-api-token">SelectViewport</code></li>
  <li><code class="component-api-token">SelectItemText</code></li>
  <li><code class="component-api-token">SelectPortal</code></li>
</ul>
</div>

### Props

#### `SelectRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `side` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'bottom'` | 기준 요소를 중심으로 팝업을 우선 배치할 방향입니다. |
| `modelValue` | `string \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `open` | `boolean` | `undefined` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `defaultOpen` | `boolean` | `false` | 컴포넌트가 관리하는 초기 열림 상태입니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `SelectPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `textValue` | `(id: string) => string` | `undefined` | 항목 값을 검색 또는 표시 문자열로 바꾸는 함수입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `align` | `'start' \| 'center' \| 'end'` | `'start'` | 기준 요소를 중심으로 팝업 내용을 정렬할 위치입니다. |
| `sideOffset` | `number` | `4` | 팝업과 기준 요소 사이 거리입니다. |
| `autoUpdate` | `boolean \| AutoUpdateOptions` | `undefined` | 레이아웃 변화에 맞춰 팝업 위치를 갱신할 방법입니다. |
| `avoidCollisions` | `boolean` | `true` | 팝업이 화면 안에 남도록 위치를 뒤집거나 이동할지 여부입니다. |
| `collisionBoundary` | `Boundary` | `undefined` | 팝업을 화면 안에 유지할 때 사용할 경계입니다. |
| `collisionPadding` | `Padding` | `8` | 팝업과 충돌 경계 사이에 둘 간격입니다. |
| `hideWhenDetached` | `boolean` | `true` | 기준 요소가 레이아웃에서 벗어나면 팝업을 숨길지 여부입니다. |
| `middleware` | `Middleware[]` | `undefined` | 기본 배치 규칙 뒤에 적용할 위치 계산 미들웨어입니다. |
| `position` | `boolean` | `true` | 실행 요소를 기준으로 팝업 위치를 계산할지 여부입니다. |
| `strategy` | `Strategy` | `'fixed'` | 기준 요소에 연결된 콘텐츠의 CSS 위치 전략입니다. |
| `typeaheadTimeoutMs` | `number` | `700` | 글자 검색 버퍼를 초기화하기 전 대기 시간(밀리초)입니다. |

#### `SelectItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `SelectPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `SelectPortalProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `to` | `string \| HTMLElement` | `'body'` | 포털 콘텐츠를 옮길 대상입니다. |

### 슬롯

#### `SelectRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string \| null` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

#### `SelectItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |

### 이벤트

#### `SelectRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:open` | `boolean` | 컴포넌트가 새 열림 상태를 요청할 때 발생합니다. |
| `highlight` | `string \| null` | 강조된 항목이 바뀔 때 발생합니다. |
| `position-change` | `ComputePositionReturn` | 팝업 콘텐츠의 계산된 배치가 갱신된 뒤 발생합니다. |

### 기타 타입

#### `SelectTextValueResolver`

```ts
type SelectTextValueResolver = NonNullable<SelectRootProps['textValue']>
```

#### `SelectValueChangeHandler`

```ts
type SelectValueChangeHandler = (value: string | null) => void
```

#### `SelectOpenChangeHandler`

```ts
type SelectOpenChangeHandler = (value: boolean) => void
```

#### `SelectHighlightHandler`

```ts
type SelectHighlightHandler = (value: string | null) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="select"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">value</code></td>
  <td><code>[data-part="value"]</code></td>
  <td>현재 확정 값을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">viewport</code></td>
  <td><code>[data-part="viewport"]</code></td>
  <td>현재 보이는 콘텐츠를 배치하고 경계를 정합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-text</code></td>
  <td><code>[data-part="item-text"]</code></td>
  <td>항목 레이블을 조작부와 분리해 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 보이는 방향에 따라 현재 선택 항목을 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 선택 가능한 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 현재 항목을 선택하거나 실행합니다. |
| <kbd>Printable text</kbd> | 글자 검색을 지원하면 다음 일치 항목으로 이동합니다. |

## 접근성

실행 요소가 포털 목록 상자를 소유하며 DOM 경계를 넘어 현재 항목·선택 항목·비활성 항목 연결을 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
