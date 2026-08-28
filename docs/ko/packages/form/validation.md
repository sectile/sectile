---
title: 검증과 오류
description: 브라우저 제약 조건, 앱 검증, schema, 서버 오류를 접근 가능한 메시지로 표시합니다.
---

# 검증과 오류

Form은 브라우저, 앱 코드, Standard Schema, 서버 응답에서 발생한 오류를 표시할 수 있습니다. 모든 오류는 같은 `FormMessage`와 `FormSummary` UI를 사용합니다.

## 브라우저 제약 조건부터 사용하기

규칙을 HTML로 표현할 수 있으면 네이티브 속성을 사용합니다.

```vue
<FormField name="email" required>
  <FormLabel>이메일 주소</FormLabel>
  <TextField type="email" minlength="6" autocomplete="email" />
  <FormMessage />
</FormField>
```

유효하지 않은 상태로 제출하면 첫 오류 필드에 포커스가 이동하고 `FormSummary`에 폼 전체 결과가 표시됩니다.

```vue
<FormRoot v-bind="submission">
  <FormSummary v-slot="{ state }">
    {{ state.issues.length }}개 필드를 확인하세요.
  </FormSummary>
  <!-- fields -->
</FormRoot>
```

Form의 `novalidate`와 제출 버튼의 `formnovalidate`는 기존 HTML 의미를 유지합니다. 네이티브 검증을 건너뛰어도 앱과 schema 검증은 실행할 수 있습니다.

## 앱 검증

여러 필드나 애플리케이션 데이터가 필요한 규칙에는 `validate`를 사용합니다. 필드 경로가 있는 메시지를 반환하거나, 폼 전체 메시지라면 경로를 생략합니다.

```ts
const validate = (values: Record<string, unknown>) => ({
  issues: values.password === values.confirmPassword
    ? []
    : [{ path: 'confirmPassword', message: '비밀번호가 일치하지 않습니다.' }],
})
```

```vue
<FormRoot
  v-bind="submission"
  :validate="validate"
  :validate-on="['blur']"
  :revalidate-on="['input']"
>
  …
</FormRoot>
```

`validateOn`은 첫 상호작용 검증 시점을, `revalidateOn`은 이미 오류가 있는 필드를 다시 검사할 시점을 정합니다. 제출할 때는 항상 전체 검증을 실행합니다.

## Standard Schema 검증

Standard Schema를 구현한 어떤 schema든 `defineFormSubmission()`에 전달할 수 있습니다. Schema가 제출값을 검증하고 변환한 출력 타입이 `onSubmit`에서 추론됩니다.

```ts
const submission = defineFormSubmission({
  schema: accountSchema,
  onSubmit: ({ values }) => {
    values.accountId // accountSchema 출력에서 추론
    return saveAccount(values)
  },
})
```

경로가 있는 schema 오류는 해당 `FormMessage`에, 그 밖의 오류는 `FormSummary`에 표시됩니다.

## 서버 오류

관리형 제출에서 필드 또는 폼 오류를 반환합니다.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData }) => {
    const result = await createAccount(formData)
    if (result.ok) return { ok: true }

    return {
      ok: false,
      issues: result.emailTaken
        ? [{ path: 'email', message: '이미 등록된 이메일입니다.' }]
        : [{ message: '계정을 만들지 못했습니다. 다시 시도하세요.' }],
    }
  },
})
```

제출과 별개로 받은 오류에는 `issues` prop을 사용합니다.

```vue
<FormRoot v-bind="submission" :issues="serverIssues">…</FormRoot>
```

사용자에게 보여 줄 문구는 명시적으로 작성하세요. 예기치 않은 Promise reject를 서비스 정보나 stack trace 노출 없이 변환하려면 `mapSubmitError`를 사용합니다.
