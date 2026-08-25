<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 피드

읽던 위치를 잃지 않고 새 활동이나 이전 기록을 불러오는 제품 활동 목록을 제공합니다.

## 용법

### 유한 피드

하나의 릴리스에서 발생한 전체 활동 기록을 확인합니다.

<ComponentExample component="feed" scenario="finite" title="유한 피드" description="하나의 릴리스에서 발생한 전체 활동 기록을 확인합니다." :index="0" />

## 예시

### 새 항목 불러오기

읽고 있던 위치를 방해하지 않고 새 배포 활동을 불러옵니다.

<ComponentExample component="feed" scenario="load-after" title="새 항목 불러오기" description="읽고 있던 위치를 방해하지 않고 새 배포 활동을 불러옵니다." :index="1" />

### 이전 항목 불러오기

현재 활동 순서를 유지하면서 이전 릴리스 기록을 이어 붙입니다.

<ComponentExample component="feed" scenario="load-before" title="이전 항목 불러오기" description="현재 활동 순서를 유지하면서 이전 릴리스 기록을 이어 붙입니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/feed`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FeedRoot</code></li>
  <li><code class="component-api-token">FeedItem</code></li>
  <li><code class="component-api-token">FeedLoadEarlier</code></li>
  <li><code class="component-api-token">FeedLoadNewer</code></li>
</ul>
</div>

### Props

#### `FeedRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `items` | `readonly string[]` | 필수 | 컴포넌트가 관리할 순서 있는 항목 값입니다. |
| `defaultHighlightedValue` | `string \| null` | `null` | 컴포넌트가 관리하는 처음 강조 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `getPosition` | `(id: string) => number` | `undefined` | 항목이 나타내는 수치 위치를 반환하는 함수입니다. |
| `revision` | `number` | `0` | 파생 콘텐츠를 다시 계산할 때 사용할 애플리케이션 변경 차수입니다. |
| `setSize` | `number` | `undefined` | 현재 피드 구간이 나타내는 전체 항목 수입니다. |

#### `FeedPartProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | 파트별로 다름 | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `FeedRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `pending` | `FeedDirection \| null` | 요청 처리 중인지 여부입니다. |
| `revision` | `number` | 현재 상태 스냅샷의 변경 차수입니다. |

#### `FeedItemSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 이 계약이 노출하는 현재 값입니다. |
| `highlightedValue` | `string \| null` | 조작 대상으로 강조된 현재 값입니다. |
| `highlighted` | `boolean` | 조작 대상으로 강조된 항목인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `pending` | `FeedDirection \| null` | 요청 처리 중인지 여부입니다. |
| `revision` | `number` | 현재 상태 스냅샷의 변경 차수입니다. |

### 이벤트

#### `FeedRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `highlight` | `string \| null` | 강조된 항목이 바뀔 때 발생합니다. |
| `request-window` | `CollectionWindowDirection, string \| null, number` | 피드가 현재 구간 밖의 항목을 요청할 때 발생합니다. |

### 기타 타입

#### `FeedPositionResolver`

```ts
type FeedPositionResolver = NonNullable<FeedRootProps['getPosition']>
```

#### `FeedHighlightHandler`

```ts
type FeedHighlightHandler = (value: string | null) => void
```

#### `FeedRequestWindowHandler`

```ts
type FeedRequestWindowHandler = (direction: FeedDirection, anchor: string | null, revision: number) => void
```

#### `FeedDirection`

```ts
type FeedDirection = CollectionWindowDirection
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="feed"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">load-earlier</code></td>
  <td><code>[data-part="load-earlier"]</code></td>
  <td>현재 피드보다 이전 항목을 요청합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">load-newer</code></td>
  <td><code>[data-part="load-newer"]</code></td>
  <td>현재 피드보다 이후 항목을 요청합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Down</kbd> / <kbd>Page Down</kbd> | 다음 글로 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Page Up</kbd> | 이전 글로 이동합니다. |
| <kbd>Tab</kbd> | 현재 글 안의 상호작용 컨트롤로 이동합니다. |

## 접근성

루트는 피드 의미를 사용하며 각 항목은 선택적인 위치와 전체 크기 정보가 있는 글로 노출됩니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/feed/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
