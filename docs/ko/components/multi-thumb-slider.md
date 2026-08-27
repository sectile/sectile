<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Multi Thumb Slider

하나의 수치 트랙에서 순서가 있는 여러 값을 조절합니다.

## 용법

### 핸들 두 개로 고르는 범위

핸들 두 개로 범위의 최솟값과 최댓값을 고릅니다.

<ComponentExample component="multi-thumb-slider" scenario="two-thumb-range" title="핸들 두 개로 고르는 범위" description="핸들 두 개로 범위의 최솟값과 최댓값을 고릅니다." :index="0" />

### 핸들 세 개로 나누는 구간

핸들 세 개로 하나의 수치 범위를 의미 있는 구간으로 나눕니다.

<ComponentExample component="multi-thumb-slider" scenario="three-thumb-thresholds" title="핸들 세 개로 나누는 구간" description="핸들 세 개로 하나의 수치 범위를 의미 있는 구간으로 나눕니다." :index="1" />

### 핸들 교차 여러 핸들

설정한 규칙에 따라 핸들 교차를 막거나 값의 순서를 정리합니다.

<ComponentExample component="multi-thumb-slider" scenario="crossing-thumbs" title="핸들 교차 여러 핸들" description="설정한 규칙에 따라 핸들 교차를 막거나 값의 순서를 정리합니다." :index="2" />

### 부모가 관리하는 범위

범위를 이루는 모든 핸들의 값을 부모가 관리합니다.

<ComponentExample component="multi-thumb-slider" scenario="controlled-range" title="부모가 관리하는 범위" description="범위를 이루는 모든 핸들의 값을 부모가 관리합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/multi-thumb-slider`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MultiThumbSliderRoot</code></li>
  <li><code class="component-api-token">MultiThumbSliderTrack</code></li>
  <li><code class="component-api-token">MultiThumbSliderRange</code></li>
  <li><code class="component-api-token">MultiThumbSliderThumb</code></li>
</ul>
</div>

### Props

#### `MultiThumbSliderRootProps`

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
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (number | string)[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컴포넌트가 값을 관리할 때 사용할 초깃값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>form</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컨트롤을 연결할 네이티브 form 요소의 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>formatValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(value: string, id: string) =&gt; string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>값을 화면에 표시할 문자열로 바꾸는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>getThumbLabel</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>(id: string) =&gt; string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>슬라이더 핸들의 접근 가능한 이름을 반환하는 함수입니다.</p>
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
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly (number | string)[]</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>name</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>네이티브 폼 제출에 사용할 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>orientation</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'horizontal' | 'vertical'</code></span><span><span class="component-api-definition__label">기본값</span><code>'horizontal'</code></span></div>
<p>배치와 키보드 이동에 사용할 축입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>MultiThumbSliderPolicies</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>step</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>1</code></span></div>
<p>컴포넌트가 받을 수 있는 최소 증감 간격입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>thumbs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>순서 있는 슬라이더 핸들 정의입니다.</p>
</dd>
</div>
</dl>

#### `MultiThumbSliderThumbProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>이 파트가 렌더링할 요소 또는 컴포넌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>asChild</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `MultiThumbSliderPartProps`

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
<p>하나뿐인 자식 요소에 파트 속성을 직접 합칠지 여부입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `MultiThumbSliderRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>activeThumb</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>현재 조절 중인 핸들의 인덱스입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>percentages</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly number[]</code></span></div>
<p>각 핸들의 백분율 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>values</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>현재 순서 있는 값 컬렉션입니다.</p>
</dd>
</div>
</dl>

#### `MultiThumbSliderThumbSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>activeThumb</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>현재 조절 중인 핸들의 인덱스입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>index</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>부모 컬렉션 안의 0부터 시작하는 위치입니다.</p>
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
<dt><code>percentages</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly number[]</code></span></div>
<p>각 핸들의 백분율 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>값 확인만 허용하는 읽기 전용 상태 여부입니다.</p>
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
<dt><code>values</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span></div>
<p>현재 순서 있는 값 컬렉션입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `MultiThumbSliderRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>readonly string[]</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `MultiThumbSliderThumbLabelResolver`

```ts
type MultiThumbSliderThumbLabelResolver = NonNullable<MultiThumbSliderRootProps['getThumbLabel']>
```

#### `MultiThumbSliderValueFormatter`

```ts
type MultiThumbSliderValueFormatter = NonNullable<MultiThumbSliderRootProps['formatValue']>
```

#### `MultiThumbSliderValueChangeHandler`

```ts
type MultiThumbSliderValueChangeHandler = (values: readonly string[]) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="multi-thumb-slider"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>하나 이상의 핸들이 이동하는 측정 경로입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">range</code></td>
  <td><code>[data-part="range"]</code></td>
  <td>트랙 위의 활성 범위를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">thumb</code></td>
  <td><code>[data-part="thumb"]</code></td>
  <td>트랙 위의 값 하나를 조절합니다.</td>
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

각 핸들에 독립적인 이름을 제공하고 최솟값·최댓값·현재 값·방향을 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
