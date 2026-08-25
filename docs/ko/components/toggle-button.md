<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토글 버튼

같은 작업을 다시 실행할 때까지 눌림 상태를 유지합니다.

## 용법

### 서식

같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다.

<ComponentExample component="toggle-button" scenario="formatting" title="서식" description="같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다." :index="0" />

### 경고

알림 감시 기능을 다시 끌 때까지 활성 상태로 유지합니다.

<ComponentExample component="toggle-button" scenario="alert" title="경고" description="알림 감시 기능을 다시 끌 때까지 활성 상태로 유지합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="toggle-button" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/toggle-button`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToggleButton</code></li>
</ul>
</div>

### Props

#### `ToggleButtonProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `boolean` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `boolean` | `false` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `ToggleButtonSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `pressed` | `boolean` | 토글이 눌린 상태인지 여부입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

### 이벤트

#### `ToggleButton`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `boolean` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

### 기타 타입

#### `ToggleButtonValueChangeHandler`

```ts
type ToggleButtonValueChangeHandler = (value: boolean) => void
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="toggle-button"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

버튼이 눌림 상태를 노출하고 비활성 동작과 읽기 전용 동작을 구분합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/button/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
