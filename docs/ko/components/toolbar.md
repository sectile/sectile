<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도구 막대

관련 작업을 짧은 막대에 모아 이동하고 현재 도구를 실행합니다.

## 용법

### 가로 도구 막대

인라인 텍스트 서식 작업을 자연스러운 가로 순서로 묶습니다.

<ComponentExample component="toolbar" scenario="formatting" title="가로 도구 막대" description="인라인 텍스트 서식 작업을 자연스러운 가로 순서로 묶습니다." :index="0" />

### 세로 도구 막대

편집 화면 옆에 캔버스 도구를 세로로 배치합니다.

<ComponentExample component="toolbar" scenario="vertical" title="세로 도구 막대" description="편집 화면 옆에 캔버스 도구를 세로로 배치합니다." :index="1" />

### 부모가 관리하는 포커스

키보드 이동 규칙은 유지하면서 현재 도구 항목을 부모가 관리합니다.

<ComponentExample component="toolbar" scenario="controlled-focus" title="부모가 관리하는 포커스" description="키보드 이동 규칙은 유지하면서 현재 도구 항목을 부모가 관리합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/toolbar`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToolbarRoot</code></li>
  <li><code class="component-api-token">ToolbarItem</code></li>
  <li><code class="component-api-token">ToolbarSeparator</code></li>
</ul>
</div>

### Props

#### `ToolbarRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `modelValue` | `string \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 배치와 키보드 이동에 사용할 축입니다. |
| `disabledItems` | `readonly string[]` | `[]` | 포커스와 선택 대상에서 제외할 항목 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `ToolbarPolicies<string>` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ToolbarItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ToolbarPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `ToolbarRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `orientation` | `'horizontal' \| 'vertical'` | 현재 배치와 이동 축입니다. |

#### `ToolbarItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |

### 이벤트

#### `ToolbarRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `invoke` | `string` | 현재 작업을 실행할 때 발생합니다. |

### 기타 타입

#### `ToolbarValueChangeHandler`

```ts
type ToolbarValueChangeHandler = (value: string | null) => void
```

#### `ToolbarInvokeHandler`

```ts
type ToolbarInvokeHandler = (value: string) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="toolbar"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 설정된 방향에 따라 도구 항목 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 활성화된 첫 번째 또는 마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 도구를 실행합니다. |

## 접근성

이름이 있는 도구 막대가 하나의 이동 탭 위치를 사용하고 구분선을 포커스 순서에서 제외합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
