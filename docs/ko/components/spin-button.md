<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 증감 입력

숫자를 직접 입력하거나 증가·감소 버튼으로 바꿉니다.

## 용법

### 정수

정수 입력을 받고 증가·감소 제어 기능을 제공합니다.

<ComponentExample component="spin-button" scenario="integer" title="정수" description="정수 입력을 받고 증가·감소 제어 기능을 제공합니다." :index="0" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="spin-button" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="1" />

## 예시

### 입력 복구

수량을 직접 입력하고 잘못된 값을 입력한 채 벗어나면 마지막으로 확정한 값으로 복구합니다.

<ComponentExample component="spin-button" scenario="invalid-draft" title="입력 복구" description="수량을 직접 입력하고 잘못된 값을 입력한 채 벗어나면 마지막으로 확정한 값으로 복구합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/spin-button`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SpinButtonRoot</code></li>
  <li><code class="component-api-token">SpinButtonInput</code></li>
  <li><code class="component-api-token">SpinButtonIncrement</code></li>
  <li><code class="component-api-token">SpinButtonDecrement</code></li>
</ul>
</div>

### Props

#### `SpinButtonRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `number \| string` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `number \| string` | `undefined` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `draft` | `string \| null` | `undefined` | 확정 전 편집 중인 외부 제어 문자열입니다. |
| `defaultDraft` | `string \| null` | `null` | 컴포넌트가 관리하는 편집 초깃값입니다. |
| `min` | `number \| string` | 필수 | 컴포넌트가 받을 수 있는 최솟값입니다. |
| `max` | `number \| string` | 필수 | 컴포넌트가 받을 수 있는 최댓값입니다. |
| `step` | `number \| string` | `1` | 컴포넌트가 받을 수 있는 최소 증감 간격입니다. |
| `pageStep` | `number` | `10` | Page Up과 Page Down이 사용할 큰 증감 간격입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `SpinButtonOptions['policies']` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `SpinButtonInputProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'input'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `SpinButtonTriggerProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `SpinButtonSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `draft` | `string \| null` | 아직 확정하지 않은 입력 문자열입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `text` | `string` | 현재 값을 표시한 문자열입니다. |

### 이벤트

#### `SpinButtonRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:draft` | `string \| null` | 편집 중인 입력 문자열이 바뀔 때 발생합니다. |

### 기타 타입

#### `SpinButtonValueChangeHandler`

```ts
type SpinButtonValueChangeHandler = (value: string) => void
```

#### `SpinButtonDraftChangeHandler`

```ts
type SpinButtonDraftChangeHandler = (value: string | null) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="spin-button"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">increment</code></td>
  <td><code>[data-part="increment"]</code></td>
  <td>설정된 한 단계만큼 값을 늘립니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">decrement</code></td>
  <td><code>[data-part="decrement"]</code></td>
  <td>설정된 한 단계만큼 값을 줄입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Right</kbd> / <kbd>Arrow Up</kbd> | 값을 한 단계 증가시킵니다. |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Down</kbd> | 값을 한 단계 감소시킵니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 최솟값 또는 최댓값으로 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 지원되는 경우 설정된 큰 단계만큼 값을 바꿉니다. |

## 접근성

입력란이 증감 입력 값 정보를 노출하고 증가·감소 요소는 이름이 있는 기본 컨트롤로 유지됩니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
