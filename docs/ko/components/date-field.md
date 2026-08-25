<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜 입력

시간대와 무관한 날짜를 구조화된 문자열로 입력하고 검증합니다.

## 용법

### ISO 날짜 날짜

시간대와 무관한 날짜를 ISO 형태로 입력합니다.

<ComponentExample component="date-field" scenario="iso-date" title="ISO 날짜 날짜" description="시간대와 무관한 날짜를 ISO 형태로 입력합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="date-field" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="date-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## API

Vue 패키지: `@sectile/vue/date-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateField</code></li>
</ul>
</div>

### Props

#### `DateFieldProps`

| 속성 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `modelValue` | `DateValue \| null` | `undefined` | 부모가 상태를 관리할 때 사용할 현재 값입니다. |
| `defaultValue` | `DateValue \| null` | `undefined` | 컴포넌트가 값을 관리할 때 사용할 초깃값입니다. |
| `disabled` | `boolean` | `undefined` | 사용자 조작을 막을지 여부입니다. |
| `readonly` | `boolean` | `undefined` | 값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다. |
| `required` | `boolean` | `undefined` | 제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다. |
| `label` | `string` | `undefined` | 보조 기술이 읽는 컨트롤 이름입니다. |
| `policies` | `DateFieldOptions['policies']` | `undefined` | 검증, 이동, 선택 동작을 조정하는 정책입니다. |
| `native` | `boolean` | `undefined` | 브라우저 기본 날짜 또는 시간 입력 UI를 사용할지 여부입니다. |

### 기타 타입

#### `DateValue`

```ts
type DateValue = NonNullable<DateFieldOptions['value']>
```

## 파트

공통 범위: <code class="component-scope-token">[data-scope="date-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 값 구간을 증가시키거나 감소시킵니다. |
| <kbd>Enter</kbd> | 입력 중인 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 값을 복원합니다. |

## 접근성

이름이 있는 입력란은 기본 텍스트 입력을 유지하며 오류·비활성·읽기 전용 상태를 전달합니다.
