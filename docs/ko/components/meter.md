<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Meter

정확한 범위 값을 품질 기준과 함께 보여 줍니다.

## 용법

### 임계 구간

명시한 기준값으로 현재 값을 최적·준최적·비최적 구간으로 분류합니다.

<ComponentExample component="meter" scenario="threshold-zones" title="임계 구간" description="명시한 기준값으로 현재 값을 최적·준최적·비최적 구간으로 분류합니다." :index="0" />

### 정확한 소수

0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다.

<ComponentExample component="meter" scenario="exact-decimal" title="정확한 소수" description="0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다." :index="1" />

### 같은 최솟값과 최댓값

최솟값과 최댓값이 같을 때 유일하게 유효한 값을 표시합니다.

<ComponentExample component="meter" scenario="degenerate-range" title="같은 최솟값과 최댓값" description="최솟값과 최댓값이 같을 때 유일하게 유효한 값을 표시합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/meter`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MeterRoot</code></li>
  <li><code class="component-api-token">MeterTrack</code></li>
  <li><code class="component-api-token">MeterIndicator</code></li>
  <li><code class="component-api-token">MeterValueText</code></li>
</ul>
</div>

### Props

#### `MeterRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'div'</code></span></div>
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
<dt><code>formatValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>MeterValueFormatter</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>값을 화면에 표시할 문자열로 바꾸는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>high</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>높은 값 구간의 하한입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>low</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>낮은 값 구간의 상한입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>max</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>100</code></span></div>
<p>컴포넌트가 받을 수 있는 최댓값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>min</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>0</code></span></div>
<p>컴포넌트가 받을 수 있는 최솟값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>optimum</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>어느 임계 구간이 최적인지 결정하는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `MeterPartProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span>파트별로 다름</span></div>
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
</dl>

### 슬롯

#### `MeterRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>high</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>높은 값 구간의 하한입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>low</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>낮은 값 구간의 상한입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>max</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>Meter 범위의 최댓값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>min</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>Meter 범위의 최솟값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>optimum</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>어느 임계 구간이 최적인지 결정하는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>percentage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>현재 값을 범위의 백분율로 나타낸 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valueText</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>현재 meter 값을 형식화한 문자열입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>zone</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'optimum' | 'suboptimal' | 'even-less-good'</code></span></div>
<p>임계값과 최적값에서 계산한 품질 구간입니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `MeterValueFormatter`

```ts
type MeterValueFormatter = (value: string) => string
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="meter"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>이름이 있는 읽기 전용 측정값과 정확한 범위를 노출합니다.</td>
  <td><code>role="meter"</code><br><code>data-zone="&lt;zone&gt;"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>범위가 있는 측정값의 시각적 경로를 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>접근 가능한 값을 중복하지 않고 정확한 백분율만큼 채웁니다.</td>
  <td><code>aria-hidden="true"</code><br><code>data-zone="&lt;zone&gt;"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">value-text</code></td>
  <td><code>[data-part="value-text"]</code></td>
  <td>서식화된 값을 텍스트로 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>None</kbd> | Meter는 읽기 전용이며 키보드 조작을 정의하지 않습니다. |

## 접근성

이름이 있는 읽기 전용 meter가 최솟값·최댓값·현재 값·형식화된 값을 노출하며 ARIA에 없는 임계값 속성을 만들지 않습니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/meter/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
