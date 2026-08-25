<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 단계 진행

진행 상태와 사용 가능 조건을 보여 주며 순서가 있는 작업을 안내합니다.

## 용법

### 결제

사용 가능한 결제 단계를 정해진 순서대로 진행합니다.

<ComponentExample component="stepper" scenario="checkout" title="결제" description="사용 가능한 결제 단계를 정해진 순서대로 진행합니다." :index="0" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="stepper" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="1" />

## 예시

### 진행 조건

현재 단계의 완료 조건을 충족하기 전에는 다음 단계로 이동하지 못하게 합니다.

<ComponentExample component="stepper" scenario="gated-step" title="진행 조건" description="현재 단계의 완료 조건을 충족하기 전에는 다음 단계로 이동하지 못하게 합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/stepper`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">StepperRoot</code></li>
  <li><code class="component-api-token">StepperList</code></li>
  <li><code class="component-api-token">StepperStep</code></li>
  <li><code class="component-api-token">StepperContent</code></li>
  <li><code class="component-api-token">StepperIndicator</code></li>
  <li><code class="component-api-token">StepperPrevious</code></li>
  <li><code class="component-api-token">StepperNext</code></li>
</ul>
</div>

### Props

#### `StepperRootProps`

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
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>''</code></span></div>
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
<dt><code>disabledItems</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span><code>[]</code></span></div>
<p>포커스와 선택 대상에서 제외할 항목 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>items</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>컴포넌트가 관리할 순서 있는 항목 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
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
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
</dl>

#### `StepperActionProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'button'</code></span></div>
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
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
</dl>

### 슬롯

#### `StepperActionSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>targetValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>이 동작이 활성화할 값입니다. 해당 방향에 활성화할 단계가 없으면 null입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `StepperRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>activate</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>항목이 활성화될 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>highlight</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>강조된 항목이 바뀔 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `StepperValueChangeHandler`

```ts
type StepperValueChangeHandler = (value: string) => void
```

#### `StepperHighlightHandler`

```ts
type StepperHighlightHandler = (value: string | null) => void
```

#### `StepperActivateHandler`

```ts
type StepperActivateHandler = (value: string) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="stepper"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">list</code></td>
  <td><code>[data-part="list"]</code></td>
  <td>컴포넌트 항목을 탐색 순서대로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">step</code></td>
  <td><code>[data-part="step"]</code></td>
  <td>순서가 있는 작업 단계 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous</code></td>
  <td><code>[data-part="previous"]</code></td>
  <td>이전의 활성화 가능한 단계를 선택하고 포커스를 옮깁니다.</td>
  <td><code>data-target-value="&lt;value&gt;"</code><br><code>data-disabled=""</code></td>
</tr>
<tr>
  <td><code class="component-part-token">next</code></td>
  <td><code>[data-part="next"]</code></td>
  <td>다음의 활성화 가능한 단계를 선택하고 포커스를 옮깁니다.</td>
  <td><code>data-target-value="&lt;value&gt;"</code><br><code>data-disabled=""</code></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 가로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 세로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 탭으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 직접 실행 모드에서 포커스된 탭을 엽니다. |

## 접근성

순서 있는 단계 목록이 현재 단계를 노출하고 각 단계 실행 요소를 내용 패널과 연결합니다.
