<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 타이머

시작·일시 정지·초기화 동작으로 경과 시간이나 남은 시간을 잽니다.

## 용법

### 스톱워치

현재 상태에 맞는 시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다.

<ComponentExample component="timer" scenario="stopwatch" title="스톱워치" description="현재 상태에 맞는 시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다." :index="0" />

### 남은 시간

시간을 설정하고 남은 시간과 완료 피드백을 확인합니다.

<ComponentExample component="timer" scenario="countdown" title="남은 시간" description="시간을 설정하고 남은 시간과 완료 피드백을 확인합니다." :index="1" />

### 목표 시간

경과 시간 목표를 설정하고 완료될 때까지 진행 상태를 확인합니다.

<ComponentExample component="timer" scenario="target" title="목표 시간" description="경과 시간 목표를 설정하고 완료될 때까지 진행 상태를 확인합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/timer`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimerRoot</code></li>
  <li><code class="component-api-token">TimerArea</code></li>
  <li><code class="component-api-token">TimerSeparator</code></li>
  <li><code class="component-api-token">TimerControl</code></li>
  <li><code class="component-api-token">TimerItem</code></li>
  <li><code class="component-api-token">TimerActionTrigger</code></li>
</ul>
</div>

### Props

#### `TimerRootProps`

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
<dt><code>autoStart</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>마운트 직후 타이머를 시작할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>countdown</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>경과 시간을 재지 않고 남은 시간을 셀지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>intervalMs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>100</code></span></div>
<p>자동 갱신 사이의 밀리초 단위 간격입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>startMs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span><span><span class="component-api-definition__label">기본값</span><code>0</code></span></div>
<p>밀리초 단위의 초기 경과 시간입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>targetMs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>밀리초 단위의 경과 시간 목표입니다.</p>
</dd>
</div>
</dl>

#### `TimerPartProps`

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

#### `TimerSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>completed</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>타이머가 목표에 도달했는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>parts</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>Readonly&lt;Record&lt;TimerItemType, number&gt;&gt;</code></span></div>
<p>현재 값을 나눈 표시 단위입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>pause</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>타이머 갱신을 멈추는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>progress</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span></div>
<p>0부터 1까지의 완료 진행률입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>reset</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>초깃값과 조작 상태로 되돌리는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>restart</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>설정한 초깃값에서 타이머를 다시 시작하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>resume</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>멈춘 타이머를 다시 시작하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>running</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>타이머가 작동 중인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>start</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>void</code></span></div>
<p>타이머 갱신을 시작하는 함수입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>valueMs</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>밀리초 단위의 현재 타이머 값입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `TimerRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>complete</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>number</code></span></div>
<p>필요한 모든 입력 칸이 채워질 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>tick</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>number</code></span></div>
<p>타이머 간격마다 새 값이 만들어질 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `TimerTickHandler`

```ts
type TimerTickHandler = (valueMs: number) => void
```

#### `TimerCompleteHandler`

```ts
type TimerCompleteHandler = (valueMs: number) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="timer"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">area</code></td>
  <td><code>[data-part="area"]</code></td>
  <td>2차원 조작 영역을 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">control</code></td>
  <td><code>[data-part="control"]</code></td>
  <td>주요 조작부를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">action-trigger</code></td>
  <td><code>[data-part="action-trigger"]</code></td>
  <td>타이머 동작을 실행합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 컴포넌트의 기본 작업 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 작업을 실행합니다. |

## 접근성

형식화된 시간 조각을 하나의 값으로 묶고 시작·일시 정지·초기화·재시작을 이름이 있는 작업으로 유지합니다.
