<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 수량 입력

정확한 물리량을 입력하고 호환되는 표시 단위로 변환합니다.

## 용법

### 길이 단위

길이를 입력하고 호환되는 표시 단위 사이를 전환합니다.

<ComponentExample component="quantity-field" scenario="length" title="길이 단위" description="길이를 입력하고 호환되는 표시 단위 사이를 전환합니다." :index="0" />

### 온도 단위

물리량은 유지하면서 호환되는 온도 단위로 변환합니다.

<ComponentExample component="quantity-field" scenario="temperature" title="온도 단위" description="물리량은 유지하면서 호환되는 온도 단위로 변환합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="quantity-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## 예시

### 계산식 입력

50-20%를 입력하면 계산 결과인 40으로 확정됩니다.

<ComponentExample component="quantity-field" scenario="calculator" title="계산식 입력" description="50-20%를 입력하면 계산 결과인 40으로 확정됩니다." :index="3" />

### 복합 단위

복합 단위를 해석하면서 하나의 기준 수량을 유지합니다.

<ComponentExample component="quantity-field" scenario="compound" title="복합 단위" description="복합 단위를 해석하면서 하나의 기준 수량을 유지합니다." :index="4" />

## API

Vue 패키지: `@sectile/vue/quantity-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">QuantityFieldRoot</code></li>
  <li><code class="component-api-token">QuantityFieldInput</code></li>
  <li><code class="component-api-token">QuantityFieldUnitSelect</code></li>
  <li><code class="component-api-token">QuantityFieldValue</code></li>
</ul>
</div>

### 함수

#### `createStandardQuantityPolicies`

```ts
function createStandardQuantityPolicies(canonicalUnit: string, unitSystem?: StandardQuantityUnitSystem): QuantityFieldPolicies
```

### Props

#### `QuantityFieldRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `QuantityValue \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `QuantityValue \| null` | `null` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `displayUnit` | `string` | `undefined` | 저장된 수량을 표시할 외부 제어 단위입니다. |
| `defaultDisplayUnit` | `string` | `undefined` | 외부에서 단위를 제어하지 않을 때 처음 사용할 표시 단위입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `QuantityFieldPolicies` | 필수 | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `QuantityFieldInputProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `as` | `PrimitiveAs` | `'input'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `QuantityFieldPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `QuantityFieldRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `QuantityValue \| null` | 이 계약이 노출하는 현재 값입니다. |
| `invalid` | `boolean` | 현재 입력이 검증에 실패했는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `displayUnit` | `string` | 현재 표시 단위입니다. |
| `text` | `string` | 현재 값을 표시한 문자열입니다. |

### 이벤트

#### `QuantityFieldRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `QuantityValue \| null` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:displayUnit` | `string` | 새 표시 단위를 요청할 때 발생합니다. |
| `commit` | `{ value: QuantityValue \| null; expression: string; displayUnit: string; }` | 현재 입력을 확정할 때 발생합니다. |

### 기타 타입

#### `StandardQuantityUnitSystem`

```ts
type StandardQuantityUnitSystem = 'metric' | 'imperial' | 'all'
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="quantity-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">unit-select</code></td>
  <td><code>[data-part="unit-select"]</code></td>
  <td>숫자 값에 적용할 단위를 선택합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">value</code></td>
  <td><code>[data-part="value"]</code></td>
  <td>현재 확정 값을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Standard editing keys</kbd> | 호스트 입력 관례에 따라 텍스트를 편집하고 선택합니다. |
| <kbd>Tab</kbd> | 기본 텍스트 동작을 유지하며 포커스를 이동합니다. |

## 접근성

이름이 있는 입력이 확정된 수량을 노출하고 단위 선택과 형식화된 출력을 별도로 식별할 수 있게 합니다.
