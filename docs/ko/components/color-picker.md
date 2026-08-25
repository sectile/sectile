<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 색상 선택기

기본 입력, 텍스트, 채널, 색상 영역으로 정확한 색을 편집합니다.

## 용법

### 브라우저 기본 색상 선택기

브라우저 기본 색상 입력과 텍스트 입력이 같은 정확한 색상값을 사용합니다.

<ComponentExample component="color-picker" scenario="native" title="브라우저 기본 색상 선택기" description="브라우저 기본 색상 입력과 텍스트 입력이 같은 정확한 색상값을 사용합니다." :index="0" />

### 투명도

화면에 보이는 색상 채널과 투명도를 함께 조절합니다.

<ComponentExample component="color-picker" scenario="alpha" title="투명도" description="화면에 보이는 색상 채널과 투명도를 함께 조절합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="color-picker" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/color-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ColorPickerRoot</code></li>
  <li><code class="component-api-token">ColorPickerLabel</code></li>
  <li><code class="component-api-token">ColorPickerControl</code></li>
  <li><code class="component-api-token">ColorPickerNativeInput</code></li>
  <li><code class="component-api-token">ColorPickerTextInput</code></li>
  <li><code class="component-api-token">ColorPickerChannelInput</code></li>
  <li><code class="component-api-token">ColorPickerCoordinateInput</code></li>
  <li><code class="component-api-token">ColorPickerCoordinateSlider</code></li>
  <li><code class="component-api-token">ColorPickerArea</code></li>
  <li><code class="component-api-token">ColorPickerAreaThumb</code></li>
  <li><code class="component-api-token">ColorPickerHueSlider</code></li>
  <li><code class="component-api-token">ColorPickerAlphaSlider</code></li>
  <li><code class="component-api-token">ColorPickerSwatch</code></li>
  <li><code class="component-api-token">ColorPickerValueText</code></li>
  <li><code class="component-api-token">ColorPickerFormatTrigger</code></li>
</ul>
</div>

### Props

#### `ColorPickerRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `string` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `string` | `'#5b6df6'` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `draft` | `string \| null` | `undefined` | 확정 전 편집 중인 외부 제어 문자열입니다. |
| `defaultDraft` | `string \| null` | `null` | 컴포넌트가 관리하는 편집 초깃값입니다. |
| `format` | `ColorFormat` | `undefined` | 외부에서 제어하는 색상 형식입니다. |
| `defaultFormat` | `ColorFormat` | `'hex'` | 컴포넌트가 관리하는 초기 색상 형식입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `allowAlpha` | `boolean` | `true` | 색상값에 투명도를 포함할 수 있는지 여부입니다. |
| `alphaStep` | `number` | `17` | 투명도 채널을 바꿀 때 적용할 증감 간격입니다. |
| `channelStep` | `number` | `1` | 색상 채널을 바꿀 때 적용할 증감 간격입니다. |

#### `ColorPickerPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ColorPickerChannelInputProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `channel` | `ColorChannel` | 필수 | 이 입력이 편집할 색상 채널입니다. |
| `as` | `PrimitiveAs` | `'input'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ColorPickerFormatTriggerProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `format` | `ColorFormat` | 필수 | 외부에서 제어하는 색상 형식입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ColorPickerCoordinateInputProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `coordinate` | `ColorCoordinate` | 필수 | 선택한 색상 모델에서 편집할 좌표입니다. |
| `format` | `ColorModel` | 필수 | 외부에서 제어하는 색상 형식입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `ColorPickerCoordinateSliderProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `coordinate` | `ColorCoordinate` | 필수 | 선택한 색상 모델에서 편집할 좌표입니다. |
| `format` | `ColorModel` | 필수 | 외부에서 제어하는 색상 형식입니다. |
| `as` | `PrimitiveAs` | `undefined` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `undefined` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `ColorPickerRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `ColorValue` | 이 계약이 노출하는 현재 값입니다. |
| `draft` | `string \| null` | 아직 확정하지 않은 입력 문자열입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `area` | `ColorAreaValue` | 현재 2차원 색상 영역 상태입니다. |
| `channel` | `ColorChannel` | 현재 색상 채널입니다. |
| `coordinates` | `readonly ColorCoordinateValue[]` | 현재 색상 모델의 좌표입니다. |
| `cssColor` | `string` | CSS 문자열로 직렬화한 현재 색상입니다. |
| `format` | `ColorFormat` | 현재 색상 형식입니다. |
| `text` | `string` | 현재 값을 표시한 문자열입니다. |

### 이벤트

#### `ColorPickerRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `string` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |
| `update:draft` | `string \| null` | 편집 중인 입력 문자열이 바뀔 때 발생합니다. |
| `update:format` | `ColorFormat` | 새 색상 형식을 요청할 때 발생합니다. |

### 기타 타입

#### `ColorPickerValueChangeHandler`

```ts
type ColorPickerValueChangeHandler = (value: string) => void
```

#### `ColorPickerDraftChangeHandler`

```ts
type ColorPickerDraftChangeHandler = (value: string | null) => void
```

#### `ColorPickerFormatChangeHandler`

```ts
type ColorPickerFormatChangeHandler = (value: ColorFormat) => void
```

#### `ColorAreaValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `x` | `number` | 필수 |
| `y` | `number` | 필수 |
| `hue` | `number` | 필수 |
| `alpha` | `number` | 필수 |

#### `ColorChannel`

```ts
type ColorChannel = 'red' | 'green' | 'blue' | 'alpha'
```

#### `ColorCoordinate`

```ts
type ColorCoordinate = ColorChannel | 'hue' | 'saturation' | 'lightness' | 'value' | 'cyan' | 'magenta' | 'yellow' | 'black' | 'chroma'
```

#### `ColorCoordinateValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `coordinate` | `ColorCoordinate` | 필수 |
| `label` | `string` | 필수 |
| `value` | `number` | 필수 |
| `min` | `number` | 필수 |
| `max` | `number` | 필수 |
| `step` | `number` | 필수 |
| `unit` | `'' \| '%' \| '°'` | 필수 |

#### `ColorFormat`

```ts
type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'hsv' | 'cmyk' | 'oklch'
```

#### `ColorModel`

```ts
type ColorModel = Exclude<ColorFormat, 'hex'>
```

#### `ColorPickerPolicies`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `allowAlpha` | `boolean` | — |
| `channelStep` | `number` | — |
| `alphaStep` | `number` | — |

#### `ColorValue`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `red` | `number` | 필수 |
| `green` | `number` | 필수 |
| `blue` | `number` | 필수 |
| `alpha` | `number` | 필수 |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="color-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">label</code></td>
  <td><code>[data-part="label"]</code></td>
  <td>컴포넌트 조작부의 레이블입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">control</code></td>
  <td><code>[data-part="control"]</code></td>
  <td>주요 조작부를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">native-input</code></td>
  <td><code>[data-part="native-input"]</code></td>
  <td>폼 제출과 플랫폼 동작을 위한 네이티브 입력을 유지합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">text-input</code></td>
  <td><code>[data-part="text-input"]</code></td>
  <td>서식화된 텍스트 값 입력을 받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">channel-input</code></td>
  <td><code>[data-part="channel-input"]</code></td>
  <td>색상 채널 하나를 숫자로 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">coordinate-input</code></td>
  <td><code>[data-part="coordinate-input"]</code></td>
  <td>현재 값의 좌표 하나를 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">coordinate-slider</code></td>
  <td><code>[data-part="coordinate-slider"]</code></td>
  <td>한 좌표를 제한된 범위에서 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">area</code></td>
  <td><code>[data-part="area"]</code></td>
  <td>2차원 조작 영역을 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">area-thumb</code></td>
  <td><code>[data-part="area-thumb"]</code></td>
  <td>2차원 영역의 선택 지점을 표시하고 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">hue-slider</code></td>
  <td><code>[data-part="hue-slider"]</code></td>
  <td>색상 색조를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">alpha-slider</code></td>
  <td><code>[data-part="alpha-slider"]</code></td>
  <td>색상 불투명도를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">swatch</code></td>
  <td><code>[data-part="swatch"]</code></td>
  <td>선택한 색상을 미리 보여줍니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">value-text</code></td>
  <td><code>[data-part="value-text"]</code></td>
  <td>서식화된 값을 텍스트로 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">format-trigger</code></td>
  <td><code>[data-part="format-trigger"]</code></td>
  <td>현재 값의 표시 형식을 바꿉니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 현재 색상 좌표나 슬라이더 값을 조절합니다. |
| <kbd>Enter</kbd> | 입력한 색상 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 색상을 복원합니다. |

## 접근성

텍스트 입력과 슬라이더가 이름, 범위, 현재 값, 색상 채널 역할을 노출해 색만으로 정보를 전달하지 않습니다.
