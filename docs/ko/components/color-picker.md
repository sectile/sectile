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
