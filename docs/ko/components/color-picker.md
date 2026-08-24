<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 색상 선택기

기본 입력, 텍스트, 채널, 색상 영역으로 정확한 색을 편집합니다.

## 예시

### 브라우저 기본 색상 선택기

브라우저 기본 색상 입력과 텍스트 입력이 같은 정확한 색상값을 사용합니다.

<ComponentExample component="color-picker" scenario="native" title="브라우저 기본 색상 선택기" description="브라우저 기본 색상 입력과 텍스트 입력이 같은 정확한 색상값을 사용합니다." :index="0" />

### 투명도

화면에 보이는 색상 채널과 투명도를 함께 조절합니다.

<ComponentExample component="color-picker" scenario="alpha" title="투명도" description="화면에 보이는 색상 채널과 투명도를 함께 조절합니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="color-picker" />

## 공개 API

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

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ColorPickerRootProps</code></li>
  <li><code class="component-api-token">ColorPickerRootSlotProps</code></li>
  <li><code class="component-api-token">ColorPickerPartProps</code></li>
  <li><code class="component-api-token">ColorPickerChannelInputProps</code></li>
  <li><code class="component-api-token">ColorPickerFormatTriggerProps</code></li>
  <li><code class="component-api-token">ColorPickerCoordinateInputProps</code></li>
  <li><code class="component-api-token">ColorPickerCoordinateSliderProps</code></li>
  <li><code class="component-api-token">ColorAreaValue</code></li>
  <li><code class="component-api-token">ColorChannel</code></li>
  <li><code class="component-api-token">ColorCoordinate</code></li>
  <li><code class="component-api-token">ColorCoordinateValue</code></li>
  <li><code class="component-api-token">ColorFormat</code></li>
  <li><code class="component-api-token">ColorModel</code></li>
  <li><code class="component-api-token">ColorPickerPolicies</code></li>
  <li><code class="component-api-token">ColorValue</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="color-picker"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">label</code></li>
  <li><code class="component-part-token">control</code></li>
  <li><code class="component-part-token">native-input</code></li>
  <li><code class="component-part-token">text-input</code></li>
  <li><code class="component-part-token">channel-input</code></li>
  <li><code class="component-part-token">coordinate-input</code></li>
  <li><code class="component-part-token">coordinate-slider</code></li>
  <li><code class="component-part-token">area</code></li>
  <li><code class="component-part-token">area-thumb</code></li>
  <li><code class="component-part-token">hue-slider</code></li>
  <li><code class="component-part-token">alpha-slider</code></li>
  <li><code class="component-part-token">swatch</code></li>
  <li><code class="component-part-token">value-text</code></li>
  <li><code class="component-part-token">format-trigger</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 현재 색상 좌표나 슬라이더 값을 조절합니다. |
| <kbd>Enter</kbd> | 입력한 색상 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 색상을 복원합니다. |

## 접근성

텍스트 입력과 슬라이더가 이름, 범위, 현재 값, 색상 채널 역할을 노출해 색만으로 정보를 전달하지 않습니다.
