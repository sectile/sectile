# 스타일 적용

Sectile 컴포넌트의 모양은 제품이 정합니다. Sectile은 각 부분과 상태를 나타내는 속성을 안정적으로 제공하므로 같은 동작에 서로 다른 디자인을 적용할 수 있습니다.

## 값보다 역할을 먼저 정하기

색상과 간격 값을 컴포넌트마다 바로 쓰면 상태 표현이 금세 달라집니다. 먼저 화면에서 맡는 역할을 이름으로 정합니다.

| 역할 | 쓰는 곳 |
| --- | --- |
| `surface-interactive` | 누르거나 선택할 수 있는 바탕 |
| `surface-selected` | 선택된 항목의 바탕 |
| `content-secondary` | 설명, 보조 정보 |
| `feedback-critical` | 즉시 확인해야 하는 상태 |
| `focus-ring` | 키보드 포커스 표시 |

이 문서의 모든 컴포넌트 예시와 가상 목록도 같은 역할 토큰을 씁니다. 버튼 색부터 `hover`, `selected`, `disabled`, `critical`, `success`, `focus`까지 어디서나 같은 뜻을 갖도록 맞췄습니다.

## 안정적인 선택자

프레임워크 컴포넌트는 `data-scope`, `data-part`, 상태 속성을 제공합니다. 빌드할 때마다 달라질 수 있는 클래스 이름 대신 이 속성으로 스타일을 연결합니다.

```css
[data-scope='checkbox'][data-part='root'][data-state='checked'] {
  color: var(--content-on-accent);
  background: var(--surface-selected);
}
```

`data-state='checked'`는 선택 상태를 뜻합니다. 색상은 테마가 정하므로 고대비 테마에서도 선택 상태라는 의미가 그대로 남습니다.

## 자식 요소에 동작 합치기

Vue 컴포넌트에는 일반 속성과 클래스를 그대로 전달할 수 있습니다. `asChild`를 지원하는 요소는 하나뿐인 자식 요소에 동작을 직접 합칩니다.

자식은 하나의 Element로 연결되어야 합니다. 요소 하나와 주석·공백만 들어 있는 슬롯 Fragment를 지원하며, Sectile 실행 요소를 중첩해도 같은 요소에 연결됩니다. 네이티브 요소 하나를 루트로 렌더링하는 컴포넌트는 그 요소를 바로 사용할 수 있습니다.

사용자 컴포넌트가 Fragment를 렌더링하거나 루트 요소를 바꾼다면 현재 요소를 노출하고, 그 요소에 속성을 전달합니다.

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';

defineOptions({ inheritAttrs: false });
const element = useTemplateRef<HTMLButtonElement>('element');
defineExpose({ element });
</script>

<template>
  <button ref="element" v-bind="$attrs"><slot /></button>
</template>
```

노출하는 값은 Element이며, 아직 사용할 수 없을 때는 `null`입니다. 참조가 바뀌면 Sectile도 새 요소에 연결됩니다. `Primitive` 역시 채택한 요소를 읽기 전용 `element`로 노출하며, 마운트를 해제하면 값을 비웁니다. 후보가 여러 개인 Fragment나 명시적인 요소 참조 없이 루트를 구분할 수 없는 컴포넌트는 거부합니다.

## 모션

공개 state 속성에 transition과 keyframe을 연결합니다. 팝업 콘텐츠는 exit animation이 끝날 때까지 유지할 수 있고, Drawer는 swipe 진행도를 제공하며, checked나 expanded part는 안정적인 상태 hook을 노출합니다.

복사해서 쓸 수 있는 팝업 열림/닫힘, 펼침 indicator, checked 상태, Drawer swipe, `prefers-reduced-motion` 예시는 [모션](/ko/guides/motion)에서 확인합니다.
