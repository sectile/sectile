<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 수량 입력

정확한 물리량을 입력하고 호환되는 표시 단위로 변환합니다.

## 예시

### 길이 단위

길이를 입력하고 호환되는 표시 단위 사이를 전환합니다.

<ComponentExample component="quantity-field" scenario="length" title="길이 단위" description="길이를 입력하고 호환되는 표시 단위 사이를 전환합니다." :index="0" />

### 온도 단위

물리량은 유지하면서 호환되는 온도 단위로 변환합니다.

<ComponentExample component="quantity-field" scenario="temperature" title="온도 단위" description="물리량은 유지하면서 호환되는 온도 단위로 변환합니다." :index="1" />

### 계산식 입력

50-20%를 입력하면 계산 결과인 40으로 확정됩니다.

<ComponentExample component="quantity-field" scenario="calculator" title="계산식 입력" description="50-20%를 입력하면 계산 결과인 40으로 확정됩니다." :index="2" />

### 복합 단위

복합 단위를 해석하면서 하나의 기준 수량을 유지합니다.

<ComponentExample component="quantity-field" scenario="compound" title="복합 단위" description="복합 단위를 해석하면서 하나의 기준 수량을 유지합니다." :index="3" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="quantity-field" />

## 공개 API

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

<div class="component-api-group">
<strong class="component-api-label">함수</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">createStandardQuantityPolicies</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">QuantityFieldRootProps</code></li>
  <li><code class="component-api-token">QuantityFieldRootSlotProps</code></li>
  <li><code class="component-api-token">QuantityFieldInputProps</code></li>
  <li><code class="component-api-token">QuantityFieldPartProps</code></li>
  <li><code class="component-api-token">StandardQuantityUnitSystem</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="quantity-field"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">input</code></li>
  <li><code class="component-part-token">unit-select</code></li>
  <li><code class="component-part-token">value</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Standard editing keys</kbd> | 호스트 입력 관례에 따라 텍스트를 편집하고 선택합니다. |
| <kbd>Tab</kbd> | 기본 텍스트 동작을 유지하며 포커스를 이동합니다. |

## 접근성

이름이 있는 입력이 확정된 수량을 노출하고 단위 선택과 형식화된 출력을 별도로 식별할 수 있게 합니다.
