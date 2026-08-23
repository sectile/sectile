# 체크박스

체크박스는 하나의 값이 선택되었는지를 나타냅니다. 자식 항목 가운데 일부만 선택된 묶음을 나타낼 때는 일부 선택 상태도 사용할 수 있습니다.

## 기본 사용법

하나의 선택 사항을 켜거나 끌 때 사용합니다. 아래 예시는 상태를 컴포넌트가 직접 관리합니다.

<CheckboxDemo />

## 일부 선택 상태

여러 자식 항목 가운데 일부만 선택되었음을 부모 체크박스에서 요약할 때 사용합니다. 사용자가 직접 고르는 세 번째 값이 아니라, 하위 선택을 보여주는 상태입니다.

<CheckboxIndeterminateDemo />

코어·브라우저·터미널 패키지에서는 이 값을 `mixed`라고 부릅니다. Vue에서는 HTML 관례에 맞춰 `indeterminate`로 제공하고 패키지 경계에서 변환합니다.

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 `defaultValue`를 사용합니다. 부모가 저장, 검증, 여러 입력 사이의 연동을 맡아야 한다면 `modelValue`와 `v-model`을 사용합니다.

<CheckboxOwnershipDemo />

## 양식 제출

`name`, `value`, `form`, `required`는 브라우저의 체크박스 제출 방식으로 연결됩니다. 선택된 체크박스만 지정한 값을 제출합니다.

<CheckboxFormDemo />

## 비활성 상태와 읽기 전용 상태

비활성 체크박스는 입력과 포커스를 받지 않으며 양식 제출에서도 빠집니다. 읽기 전용 체크박스는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꾸지는 못합니다.

<CheckboxInteractionDemo />

## 구성

```vue
<CheckboxRoot>
  <CheckboxIndicator />
</CheckboxRoot>
```

`CheckboxRoot`가 값, 입력 처리, 양식 연결과 상태 속성을 제공합니다. `CheckboxIndicator`는 선택이 해제되어도 같은 위치에 남고 `hidden`으로 표시 여부만 바꿉니다.

## 속성

| 속성 | 형식 | 초깃값 | 역할 |
| --- | --- | --- | --- |
| `modelValue` | `boolean \| 'indeterminate'` | — | 부모가 관리하는 현재 값 |
| `defaultValue` | `boolean \| 'indeterminate'` | `false` | 컴포넌트가 관리할 초깃값 |
| `disabled` | `boolean` | `false` | 입력, 포커스와 양식 제출 비활성화 |
| `readonly` | `boolean` | `false` | 값을 보여주되 변경은 거부 |
| `required` | `boolean` | `false` | 필수 입력으로 양식에 연결 |
| `name` | `string` | — | 양식 필드 이름 |
| `value` | `string` | `'on'` | 선택되었을 때 제출할 값 |
| `form` | `string` | — | 외부 양식과 연결할 식별자 |
| `as` | `string \| Component` | `'button'` | 화면에 만들 요소나 컴포넌트 |
| `asChild` | `boolean` | `false` | 하나의 자식 요소에 동작을 합성 |

값이 바뀌면 `update:modelValue`가 `boolean | 'indeterminate'` 값을 전달합니다.

## 상태 속성

값과 상호작용 상태를 바꾼 뒤 루트나 표시 요소를 선택하면, 각 구성 요소에 어떤 속성이 적용되는지 바로 확인할 수 있습니다.

<CheckboxAttributesDemo />

루트에는 `data-state="checked"`, `data-state="unchecked"`, `data-state="indeterminate"` 가운데 하나가 적용됩니다. 비활성 상태에는 `data-disabled`, 읽기 전용 상태에는 `data-readonly`가 추가됩니다.

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 선택 상태 전환 |
| <kbd>Tab</kbd> | 문서의 다음 포커스 대상으로 이동 |

터미널 예시에서는 <kbd>Space</kbd> 또는 <kbd>Enter</kbd>로 상태를 바꿀 수 있습니다.

## 접근성

일부 선택 상태는 `aria-checked="mixed"`로 전달됩니다. 비활성 상태와 읽기 전용 상태는 서로 다른 의미로 유지됩니다.

[WAI-ARIA 체크박스 지침](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 관련 접근성 규칙을 확인할 수 있습니다.
