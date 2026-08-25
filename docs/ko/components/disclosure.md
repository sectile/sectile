<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 상세 내용 펼치기

하나의 실행 요소로 선택적인 내용을 펼치고 접습니다.

## 용법

### 닫힌 상태

닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다.

<ComponentExample component="disclosure" scenario="closed" title="닫힌 상태" description="닫힌 상태에서 시작하고 연결된 실행 요소를 눌렀을 때만 엽니다." :index="0" />

### 열림 상태

열린 상태에서 시작해 포커스, 닫힘, 화면 배치를 바로 확인합니다.

<ComponentExample component="disclosure" scenario="open" title="열림 상태" description="열린 상태에서 시작해 포커스, 닫힘, 화면 배치를 바로 확인합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="disclosure" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/disclosure`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DisclosureRoot</code></li>
  <li><code class="component-api-token">DisclosureTrigger</code></li>
  <li><code class="component-api-token">DisclosureContent</code></li>
</ul>
</div>

### Props

#### `DisclosureRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `boolean` | `false` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |
| `contentId` | `string` | `undefined` | 이 실행 요소가 제어하는 콘텐츠의 ID입니다. |

#### `DisclosureTriggerProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `DisclosureContentProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `DisclosureSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `open` | `boolean` | 연결된 팝업이나 펼침 영역이 열려 있는지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

### 이벤트

#### `DisclosureRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

### 기타 타입

#### `DisclosureValueChangeHandler`

```ts
type DisclosureValueChangeHandler = (value: boolean) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="disclosure"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 연결된 내용을 펼치거나 접습니다. |
| <kbd>Tab</kbd> | 실행 요소와 주변 컨트롤 사이를 이동합니다. |

## 접근성

실행 요소가 펼침 상태와 연결된 내용의 관계를 노출합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
