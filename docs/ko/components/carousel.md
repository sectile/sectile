<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 회전 목록

이전·다음·직접 이동 제어로 연속된 슬라이드를 탐색합니다.

## 용법

### 순환 이동

마지막 슬라이드 다음에는 첫 슬라이드로, 첫 슬라이드 이전에는 마지막으로 이동합니다.

<ComponentExample component="carousel" scenario="wrapping" title="순환 이동" description="마지막 슬라이드 다음에는 첫 슬라이드로, 첫 슬라이드 이전에는 마지막으로 이동합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="carousel" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

### 일시 정지

자동 이동을 멈춘 상태에서도 직접 이전·다음 항목으로 이동할 수 있습니다.

<ComponentExample component="carousel" scenario="paused" title="일시 정지" description="자동 이동을 멈춘 상태에서도 직접 이전·다음 항목으로 이동할 수 있습니다." :index="2" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="carousel" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/carousel`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CarouselRoot</code></li>
  <li><code class="component-api-token">CarouselViewport</code></li>
  <li><code class="component-api-token">CarouselTrack</code></li>
  <li><code class="component-api-token">CarouselIndicatorGroup</code></li>
  <li><code class="component-api-token">CarouselPrevious</code></li>
  <li><code class="component-api-token">CarouselNext</code></li>
  <li><code class="component-api-token">CarouselPause</code></li>
  <li><code class="component-api-token">CarouselSlide</code></li>
  <li><code class="component-api-token">CarouselIndicator</code></li>
</ul>
</div>

### Props

#### `CarouselRootProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>as</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>PrimitiveAs</code></span><span><span class="component-api-definition__label">기본값</span><code>'section'</code></span></div>
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
<dt><code>autoplay</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean | CarouselAutoplayOptions</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>직접 조작하지 않아도 캐러셀이 자동으로 넘어갈지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultPaused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>컴포넌트가 관리하는 초기 일시 정지 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
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
<dt><code>label</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>보조 기술이 읽는 컨트롤 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
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
<dt><code>paused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>외부에서 제어하는 일시 정지 상태입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>policies</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>CarouselPolicies</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>검증, 이동, 선택 동작을 조정하는 정책입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>slides</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>readonly string[]</code></span><span><span class="component-api-definition__label">기본값</span>필수</span></div>
<p>캐러셀이 관리할 순서 있는 슬라이드 값입니다.</p>
</dd>
</div>
</dl>

#### `CarouselPartProps`

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

#### `CarouselRootSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>count</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>컬렉션의 값 개수입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span></div>
<p>부모 컬렉션 안의 0부터 시작하는 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>paused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>자동 갱신이 멈춘 상태인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>value</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | null</code></span></div>
<p>이 계약이 노출하는 현재 값입니다.</p>
</dd>
</div>
</dl>

#### `CarouselSlideSlotProps`

<dl class="component-api-definitions component-api-definitions--slots">
<div class="component-api-definition">
<dt><code>active</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>현재 활성 항목인지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>count</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number</code></span></div>
<p>컬렉션의 값 개수입니다.</p>
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
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>number | null</code></span></div>
<p>부모 컬렉션 안의 0부터 시작하는 위치입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>paused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span></div>
<p>자동 갱신이 멈춘 상태인지 여부입니다.</p>
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

#### `CarouselRoot`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>announce</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string</code></span></div>
<p>보조 기술에 피드백을 알려야 할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | null</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>update:paused</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>boolean</code></span></div>
<p>컴포넌트가 새 일시 정지 상태를 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `CarouselValueChangeHandler`

```ts
type CarouselValueChangeHandler = (value: string | null) => void
```

#### `CarouselPausedChangeHandler`

```ts
type CarouselPausedChangeHandler = (value: boolean) => void
```

#### `CarouselAnnounceHandler`

```ts
type CarouselAnnounceHandler = (value: string) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="carousel"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">viewport</code></td>
  <td><code>[data-part="viewport"]</code></td>
  <td>현재 보이는 콘텐츠를 배치하고 경계를 정합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">track</code></td>
  <td><code>[data-part="track"]</code></td>
  <td>하나 이상의 핸들이 이동하는 측정 경로입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">slide</code></td>
  <td><code>[data-part="slide"]</code></td>
  <td>캐러셀 페이지 하나를 나타냅니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous</code></td>
  <td><code>[data-part="previous"]</code></td>
  <td>이전 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next</code></td>
  <td><code>[data-part="next"]</code></td>
  <td>다음 항목이나 페이지로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">pause</code></td>
  <td><code>[data-part="pause"]</code></td>
  <td>자동 이동을 일시 정지하거나 다시 시작합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator-group</code></td>
  <td><code>[data-part="indicator-group"]</code></td>
  <td>직접 위치 이동 조작부를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 이전 또는 다음 슬라이드로 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 슬라이드로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 기본 이전·다음·일시 정지·표시 컨트롤을 실행합니다. |

## 접근성

슬라이드, 이동 버튼, 일시 정지 버튼, 표시 항목을 각각 이름이 있고 조작 가능한 요소로 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
