---
title: SSR과 hydration
description: 서버 렌더링 폼을 제어 값과 Teleport를 포함해 안정적으로 hydration합니다.
---

# SSR과 hydration

`FormRoot`, `FormField`와 표준 Form 파트는 서버에서 렌더링할 수 있습니다. 첫 클라이언트 렌더가 서버 HTML과 일치하도록 일반적인 Vue SSR 규칙을 따르세요.

## 초기값을 결정적으로 유지하기

서버와 첫 클라이언트 렌더에서 같은 `defaultValue`, `value`, 선택 option, checked 상태를 사용합니다. 클라이언트 전용 설정은 hydration 뒤에 불러오고 초기 트리를 바꾸지 마세요.

```vue
<FormField name="locale">
  <FormLabel>언어</FormLabel>
  <select :value="initialLocale">
    <option value="en">English</option>
    <option value="ko">한국어</option>
  </select>
</FormField>
```

값을 `v-model`로 제어하면 hydration 전후 모두 애플리케이션이 소유합니다.

## 안정적인 필드 ID 사용하기

서버와 클라이언트가 같은 트리를 렌더링하면 자동 ID도 hydration에 안전합니다. 테스트, 외부 마크업, URL fragment에서 필드를 참조해야 하면 명시적인 `id`를 지정하세요.

```vue
<FormField id="billing-email" name="email">
  <FormLabel>결제 이메일</FormLabel>
  <TextField type="email" />
  <FormMessage />
</FormField>
```

## 검증은 브라우저에서 시작합니다

서버에서는 폼 구조와 네이티브 속성을 출력합니다. 브라우저 제약 조건 검사, 포커스 이동, 사용자 상호작용 검증, 제출은 hydration 뒤 시작합니다. 서버가 이미 오류를 알고 있다면 `issues`로 전달해 양쪽에 같은 메시지를 렌더링하세요.

```vue
<FormRoot :issues="initialIssues" v-bind="submission">…</FormRoot>
```

## Teleport와 외부 컨트롤

서버 HTML에 안정적인 Teleport target을 렌더링합니다. 컨트롤이 `<form>` 밖에 있다면 같은 `FormField` 소유권과 네이티브 `form` 연결을 유지하세요.

```vue
<FormRoot id="profile-form" v-bind="submission">…</FormRoot>
<div id="profile-actions" />

<Teleport to="#profile-actions">
  <FormSubmit form="profile-form">프로필 저장</FormSubmit>
</Teleport>
```

사용자 정의 입력을 Teleport한다면 [사용자 정의 컨트롤](./custom-controls)에 따라 고정 template ref 또는 `shallowRef()`를 사용하세요.

## Hydration 확인 목록

- 서버와 첫 클라이언트 렌더의 필드 순서와 조건 분기가 같습니다.
- 제어 값이 같은 데이터로 초기화됩니다.
- Hydration 중 네이티브 `name`, `form`, `required`, `disabled`, `readonly` 속성이 바뀌지 않습니다.
- Teleport target이 초기 문서에 존재합니다.
- 클라이언트 전용 검증이나 서버 요청은 hydration 뒤 시작합니다.

기본 구성은 [Vue 폼](./vue), 제어 값 소유권은 [제출과 초기화](./submission)를 참고하세요.
