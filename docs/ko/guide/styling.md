# 스타일 적용

Sectile 컴포넌트는 모양을 정하지 않습니다. 같은 동작도 제품에 따라 전혀 다르게 보여야 하기 때문입니다. 대신 각 부분과 상태를 나타내는 속성을 안정적으로 제공합니다.

## 값보다 역할을 먼저 정하기

색상과 간격 값을 컴포넌트마다 바로 쓰면 상태 표현이 금세 달라집니다. 먼저 화면에서 맡는 역할을 이름으로 정합니다.

| 역할 | 쓰는 곳 |
| --- | --- |
| `surface-interactive` | 누르거나 선택할 수 있는 바탕 |
| `surface-selected` | 선택된 항목의 바탕 |
| `content-secondary` | 설명, 보조 정보 |
| `feedback-critical` | 즉시 확인해야 하는 상태 |
| `focus-ring` | 키보드 포커스 표시 |

이 문서의 모든 컴포넌트 예시와 가상 목록도 같은 역할 토큰을 씁니다. 버튼 색을 맞추는 데서 끝나지 않고, `hover`, `selected`, `disabled`, `critical`, `success`, `focus`가 어디서나 같은 뜻을 갖도록 맞췄습니다.

## 안정적인 선택자

프레임워크 컴포넌트는 `data-scope`, `data-part`, 상태 속성을 제공합니다. 빌드할 때마다 달라질 수 있는 클래스 이름 대신 이 속성으로 스타일을 연결합니다.

```css
[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  color: var(--content-on-accent);
  background: var(--surface-selected);
}
```

`data-state='checked'`는 파란색을 뜻하지 않습니다. 선택됐다는 뜻입니다. 색을 바꾸거나 고대비 테마를 추가해도 선택 상태라는 의미는 그대로 남습니다.

## 자식 요소에 동작 합치기

Vue 컴포넌트에는 일반 속성과 클래스를 그대로 전달할 수 있습니다. `asChild`를 지원하는 요소는 별도 감싸기 요소를 만들지 않고 하나뿐인 자식 요소에 동작을 합칩니다.

## 움직임

움직임도 상태 속성에 맞춰 적용합니다. 나타나고 사라지는 과정을 모두 보여야 한다면 요소를 DOM에서 언제 뺄지 먼저 정합니다. `prefers-reduced-motion`에서는 같은 상태 변화를 움직임 없이 전달해야 합니다.
