<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 탭

포커스와 실행 방식을 조정하며 같은 단계의 패널을 전환합니다.

## 용법

### 직접 선택

탭 사이에서 포커스만 옮기고 확정할 때 패널을 바꿉니다.

<ComponentExample component="tabs" scenario="manual" title="직접 선택" description="탭 사이에서 포커스만 옮기고 확정할 때 패널을 바꿉니다." :index="0" />

### 자동 전환

자동으로 다음 항목으로 이동하면서 일시 정지와 직접 이동 기능도 제공합니다.

<ComponentExample component="tabs" scenario="automatic" title="자동 전환" description="자동으로 다음 항목으로 이동하면서 일시 정지와 직접 이동 기능도 제공합니다." :index="1" />

### 세로 방향 비활성 항목

사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다.

<ComponentExample component="tabs" scenario="vertical-disabled" title="세로 방향 비활성 항목" description="사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/tabs`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TabsRoot</code></li>
  <li><code class="component-api-token">TabsList</code></li>
  <li><code class="component-api-token">TabsTrigger</code></li>
  <li><code class="component-api-token">TabsContent</code></li>
  <li><code class="component-api-token">TabsIndicator</code></li>
</ul>
</div>

### Props

#### `TabsRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `modelValue` | `string` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string` | `''` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 배치와 키보드 이동에 사용할 축입니다. |
| `activationMode` | `TabsActivationMode` | `'automatic'` | 포커스 이동만으로 탭을 열지, 명시적으로 확정할 때 열지 정합니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TabsListProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TabsTriggerProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TabsContentProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `TabsIndicatorProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'span'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `TabsRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

#### `TabsTriggerSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |

#### `TabsContentSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `selected` | `boolean` | 현재 선택된 항목인지 여부입니다. |

### 이벤트

#### `TabsRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `activate` | `string` | 항목이 활성화될 때 발생합니다. |
| `highlight` | `string \| null` | 강조된 항목이 바뀔 때 발생합니다. |

### 기타 타입

#### `TabsActivationMode`

```ts
type TabsActivationMode = 'automatic' | 'manual'
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="tabs"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">list</code></td>
  <td><code>[data-part="list"]</code></td>
  <td>컴포넌트 항목을 탐색 순서대로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 가로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 세로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 탭으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 직접 실행 모드에서 포커스된 탭을 엽니다. |

## 접근성

탭 목록이 각 탭을 하나의 탭 패널과 연결하고 선택·비활성·방향 상태를 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
