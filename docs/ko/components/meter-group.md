<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Meter Group

하나의 정확한 공용 용량을 이름과 순서가 있는 측정값으로 나눠 보여 줍니다.

## 용법

### grouped capacity

하나의 공용 용량을 순서와 이름이 있는 측정값 및 명시적인 잔여 공간으로 나눕니다.

<ComponentExample component="meter-group" scenario="grouped-capacity" title="grouped capacity" description="하나의 공용 용량을 순서와 이름이 있는 측정값 및 명시적인 잔여 공간으로 나눕니다." :index="0" />

### zero values

값이 0인 항목도 순서를 유지하되 시각적 용량은 할당하지 않습니다.

<ComponentExample component="meter-group" scenario="zero-values" title="zero values" description="값이 0인 항목도 순서를 유지하되 시각적 용량은 할당하지 않습니다." :index="1" />

### 정확한 값 정확한 소수

0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다.

<ComponentExample component="meter-group" scenario="exact-decimal" title="정확한 값 정확한 소수" description="0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다." :index="2" />

### 잘못된 입력값

정확한 합계가 공용 용량을 넘는 구성을 거부합니다.

<ComponentExample component="meter-group" scenario="invalid-input" title="잘못된 입력값" description="정확한 합계가 공용 용량을 넘는 구성을 거부합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/meter-group`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MeterGroupRoot</code></li>
  <li><code class="component-api-token">MeterGroupTrack</code></li>
  <li><code class="component-api-token">MeterGroupSegment</code></li>
  <li><code class="component-api-token">MeterGroupIndicator</code></li>
  <li><code class="component-api-token">MeterGroupValueText</code></li>
  <li><code class="component-api-token">MeterGroupList</code></li>
  <li><code class="component-api-token">MeterGroupItem</code></li>
  <li><code class="component-api-token">MeterGroupItemIndicator</code></li>
  <li><code class="component-api-token">MeterGroupItemLabel</code></li>
  <li><code class="component-api-token">MeterGroupItemValue</code></li>
</ul>
</div>

### Props

#### `MeterGroupRootProps`

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
<dt><code>formatTotal</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>MeterGroupTotalFormatter</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>전체 합계와 최댓값을 화면에 표시할 문자열로 바꾸는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>formatValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>MeterGroupValueFormatter</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
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
<dt><code>items</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly MeterGroupEntry[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>컴포넌트가 관리할 순서 있는 항목 값입니다.</p>
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
<dt><code>optimum</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>어느 임계 구간이 최적인지 결정하는 값입니다.</p>
</dd>
</div>
</dl>

#### `MeterGroupSegmentProps`

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
<p>래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>관련 파트를 연결하는 안정적인 ID입니다.</p>
</dd>
</div>
</dl>

#### `MeterGroupItemProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'li'</code></span></div>
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
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>관련 파트를 연결하는 안정적인 ID입니다.</p>
</dd>
</div>
</dl>

#### `MeterGroupPartProps`

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

#### `MeterGroupSegmentSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>end</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>공유 범위 안에서 이 구간이 끝나는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>endPercentage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>공유 범위 대비 구간 끝점의 백분율입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>현재 필드 또는 항목의 안정적인 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
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
<dt><code>start</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>공유 범위 안에서 이 구간이 시작하는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>startPercentage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>공유 범위 대비 구간 시작점의 백분율입니다.</p>
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
<p>현재 범위 값을 사용할 수 있을 때 형식화한 문자열입니다.</p>
</dd>
</div>
</dl>

#### `MeterGroupRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>max</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>숫자 범위의 최댓값입니다.</p>
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
<dt><code>remaining</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>공유 최댓값까지 할당되지 않고 남은 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>segments</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly MeterGroupSegmentSlotProps[]</code></span></div>
<p>공유 범위에서 계산한 순서 있는 구간 목록입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>total</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>모든 구간 값의 합계입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valueText</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>현재 범위 값을 사용할 수 있을 때 형식화한 문자열입니다.</p>
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

#### `MeterGroupItemSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>end</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>공유 범위 안에서 이 구간이 끝나는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>endPercentage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>공유 범위 대비 구간 끝점의 백분율입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>id</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>현재 필드 또는 항목의 안정적인 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
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
<dt><code>start</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>공유 범위 안에서 이 구간이 시작하는 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>startPercentage</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>공유 범위 대비 구간 시작점의 백분율입니다.</p>
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
<p>현재 범위 값을 사용할 수 있을 때 형식화한 문자열입니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `MeterGroupEntry`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `id` | `string` | 필수 |
| `value` | `number \| string` | 필수 |
| `label` | `string` | 필수 |

#### `MeterGroupValueFormatter`

```ts
type MeterGroupValueFormatter = (value: string, entry: MeterGroupEntry) => string
```

#### `MeterGroupTotalFormatter`

```ts
type MeterGroupTotalFormatter = (total: string, max: string) => string
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="meter-group"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>중복 집계 meter를 만들지 않고 관련 측정값 묶음에 이름을 제공합니다.</td>
  <td><code>role="group"</code><br><code>data-zone="&lt;zone&gt;"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>하위 meter의 의미를 유지하면서 순서가 있는 시각적 트랙을 제공합니다.</td>
  <td><code>role="presentation"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">segment</code></td>
  <td><code>[data-part="segment"]</code></td>
  <td>이름이 있는 측정값 하나와 정확한 누적 시작·끝 위치를 노출합니다.</td>
  <td><code>role="meter"</code><br><code>data-id="&lt;id&gt;"</code><br><code>data-start-percentage="&lt;percentage&gt;"</code><br><code>data-end-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>접근 가능한 값을 중복하지 않고 현재 구간을 그립니다.</td>
  <td><code>aria-hidden="true"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">value-text</code></td>
  <td><code>[data-part="value-text"]</code></td>
  <td>서식화된 값을 텍스트로 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">list</code></td>
  <td><code>[data-part="list"]</code></td>
  <td>이름이 있는 meter 안내를 반복하지 않도록 시각적 범례를 묶습니다.</td>
  <td><code>aria-hidden="true"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>같은 Core 구간을 키로 사용하는 범례 행 하나를 유지합니다.</td>
  <td><code>data-id="&lt;id&gt;"</code><br><code>aria-hidden="true"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">item-indicator</code></td>
  <td><code>[data-part="item-indicator"]</code></td>
  <td>항목의 선택 상태를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-label</code></td>
  <td><code>[data-part="item-label"]</code></td>
  <td>Item Label 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item-value</code></td>
  <td><code>[data-part="item-value"]</code></td>
  <td>Item Value 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>None</kbd> | 범위 표시는 읽기 전용이며 키보드 조작을 정의하지 않습니다. |

## 접근성

이름이 있는 하나의 그룹 안에 순서와 이름이 있는 읽기 전용 meter를 두며 시각적 트랙과 범례는 집계 값을 중복 안내하지 않습니다.
