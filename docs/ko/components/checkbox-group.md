<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 체크박스 묶음

하나의 묶음에서 서로 독립된 선택지를 원하는 만큼 고릅니다.

## 용법

### 배포 채널 색상 채널 조절

서로 독립된 배포 채널을 하나 이상 선택합니다.

<ComponentExample component="checkbox-group" scenario="release-channels" title="배포 채널 색상 채널 조절" description="서로 독립된 배포 채널을 하나 이상 선택합니다." :index="0" />

### 비활성 항목 선택 항목

사용할 수 없는 선택지는 그대로 보여 주되 나머지 선택지는 계속 조작할 수 있습니다.

<ComponentExample component="checkbox-group" scenario="disabled-choice" title="비활성 항목 선택 항목" description="사용할 수 없는 선택지는 그대로 보여 주되 나머지 선택지는 계속 조작할 수 있습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="checkbox-group" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/checkbox-group`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxGroupRoot</code></li>
  <li><code class="component-api-token">CheckboxGroupItem</code></li>
  <li><code class="component-api-token">CheckboxGroupIndicator</code></li>
</ul>
</div>

### Props

#### `CheckboxGroupRootProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `readonly string[]` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `readonly string[]` | `[]` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `false` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `false` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `name` | `string` | `undefined` | 네이티브 폼 제출에 사용할 이름입니다. |
| `form` | `string` | `undefined` | 컨트롤을 연결할 네이티브 form 요소의 ID입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `as` | `PrimitiveAs` | `'div'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

#### `CheckboxGroupItemProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `value` | `string` | 필수 | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | `false` | 사용자 조작을 막을지 여부입니다. |
| `required` | `boolean` | `undefined` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `as` | `PrimitiveAs` | `'button'` | 이 파트가 렌더링할 요소 또는 컴포넌트입니다. |
| `asChild` | `boolean` | `false` | 래퍼를 만들지 않고 하나의 자식 요소에 파트 속성을 합칠지 여부입니다. |

### 슬롯

#### `CheckboxGroupRootSlotProps`

| 값 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `readonly string[]` | 이 계약이 노출하는 현재 값입니다. |
| `disabled` | `boolean` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |

### 이벤트

#### `CheckboxGroupRoot`

| 이벤트 | 페이로드 | 설명 |
| --- | --- | --- |
| `update:modelValue` | `readonly string[]` | 컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다. |

## 파트

공통 범위: <code class="component-scope-token">[data-scope="checkbox-group"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Tab</kbd> | 묶음 안팎으로 포커스를 이동합니다. |
| <kbd>Space</kbd> | 포커스된 체크박스 항목을 전환합니다. |

## 접근성

이름이 있는 묶음 안에서 각 항목을 선택·비활성 상태가 있는 독립 체크박스로 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
