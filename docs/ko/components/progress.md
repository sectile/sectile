<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Progress

작업 완료도를 정확히 보여 주거나 진행량을 알 수 없는 상태를 나타냅니다.

## 용법

### 확정된 진행량

명시한 최댓값을 기준으로 확인된 완료량을 보여 줍니다.

<ComponentExample component="progress" scenario="determinate" title="확정된 진행량" description="명시한 최댓값을 기준으로 확인된 완료량을 보여 줍니다." :index="0" />

### 알 수 없는 진행량

아직 완료량을 알 수 없는 작업 상태를 나타냅니다.

<ComponentExample component="progress" scenario="indeterminate" title="알 수 없는 진행량" description="아직 완료량을 알 수 없는 작업 상태를 나타냅니다." :index="1" />

### 완료

현재 값이 최댓값에 도달한 완료 상태를 보여 줍니다.

<ComponentExample component="progress" scenario="complete" title="완료" description="현재 값이 최댓값에 도달한 완료 상태를 보여 줍니다." :index="2" />

### 정확한 소수

0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다.

<ComponentExample component="progress" scenario="exact-decimal" title="정확한 소수" description="0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/progress`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ProgressRoot</code></li>
  <li><code class="component-api-token">ProgressTrack</code></li>
  <li><code class="component-api-token">ProgressIndicator</code></li>
  <li><code class="component-api-token">ProgressValueText</code></li>
</ul>
</div>

### Props

#### `ProgressRootProps`

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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>ProgressValueFormatter</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>값을 화면에 표시할 문자열로 바꾸는 함수입니다.</p>
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
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `ProgressPartProps`

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

#### `ProgressRootSlotProps`

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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span></div>
<p>현재 값을 범위의 백분율로 나타낸 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>status</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>'indeterminate' | 'progressing' | 'complete'</code></span></div>
<p>현재 생명주기 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valueText</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>현재 범위 값을 사용할 수 있을 때 형식화한 문자열입니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `ProgressValueFormatter`

```ts
type ProgressValueFormatter = (value: string) => string
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="progress"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>확정된 완료량 또는 진행량을 알 수 없는 상태를 노출합니다.</td>
  <td><code>role="progressbar"</code><br><code>data-status="&lt;status&gt;"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
</tr>
<tr>
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>작업 완료도의 시각적 경로를 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>접근성 의미를 중복하지 않고 알려진 정확한 백분율만큼 채웁니다.</td>
  <td><code>aria-hidden="true"</code><br><code>data-status="&lt;status&gt;"</code><br><code>data-percentage="&lt;percentage&gt;"</code></td>
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
| <kbd>None</kbd> | 범위 표시는 읽기 전용이며 키보드 조작을 정의하지 않습니다. |

## 접근성

이름이 있는 진행 표시줄은 0과 최댓값을 노출하고 진행량을 알 수 없을 때 현재 값과 값 텍스트를 생략합니다.
