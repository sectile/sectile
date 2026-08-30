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

유효하지 않은 상태로 제출하면 첫 이슈의 주 필드에 포커스가 이동합니다. 주 필드 없이 관련 필드만 있는 이슈라면 폼 순서상 첫 관련 필드가 포커스를 받습니다. 하나의 이슈가 여러 필드를 무효로 만들어도 `FormSummary`에는 한 번만 표시됩니다.

```vue
<FormRoot v-bind="submission">
  <FormSummary v-slot="{ submission, issues, serverIssues, firstIssue }">
    <p v-if="submission.failure">{{ submission.failure.message }}</p>
    <p v-else-if="firstIssue">{{ firstIssue.message }}</p>
    <small v-if="serverIssues.length">서버에서 {{ serverIssues.length }}개 값을 거부했습니다.</small>
  </FormSummary>
  <!-- fields -->
</FormRoot>
```

슬롯에는 `validation`과 `valid`도 함께 제공됩니다. 사용자 슬롯이 없으면 `FormSummary`가 제출 실패 메시지와 canonical 이슈 메시지를 순서대로 렌더링합니다.

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

## 여러 필드와 관련된 이슈 하나

여러 값의 관계를 메시지 하나로 설명하려면 `relatedPaths`를 사용합니다. 이슈는 summary에 하나의 canonical 항목으로 남고, `path`와 `relatedPaths`가 가리키는 등록 필드는 모두 무효가 됩니다.

```ts
const validate = (values: Record<string, unknown>) => ({
  issues: lookupMatches(values.orderNumber, values.email)
    ? []
    : [{
        path: 'orderNumber',
        relatedPaths: ['email'],
        message: '주문번호와 이메일을 확인해 주세요.',
      }],
})
```

`path`는 주 소유자입니다. 해당 필드의 `FormMessage`가 메시지를 렌더링하고 제출 실패 뒤 첫 포커스 대상이 됩니다. 관련 필드도 무효가 되지만 각 필드에서 메시지를 반복하지 않고, 접근성 오류 맥락을 위해 summary를 참조합니다.

상태에서는 `allIssues`가 순서 있는 canonical 전체 컬렉션입니다. `issues`에는 등록된 주 소유자가 없는 이슈만, 각 필드의 `issues`에는 직접 소유한 이슈만 들어갑니다. `relatedIssues`에는 다른 필드가 소유한 canonical 참조가 들어갑니다. 사용자 summary 전체를 만들 때는 필드 projection을 합치지 말고 `allIssues`를 사용하세요.

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

관리형 제출에서 필드 관련 이슈와 폼 전체 제출 실패를 따로 반환하거나 둘을 함께 반환할 수 있습니다.

```ts
const submission = defineFormSubmission({
  onSubmit: async ({ formData }) => {
    const result = await createAccount(formData)
    if (result.ok) return { ok: true }

    if (result.emailTaken) {
      return {
        ok: false,
        issues: [{ path: 'email', message: '이미 등록된 이메일입니다.' }],
      }
    }
    return {
      ok: false,
      failure: { message: '계정을 만들지 못했습니다. 다시 시도하세요.' },
    }
  },
})
```

`failure`는 `submission.status`를 `failed`로 바꾸지만 폼이나 필드를 무효로 만들지 않습니다. 서버 이슈는 주 필드와 관련 필드를 무효로 만듭니다. 연결된 필드 중 하나의 값이 실제로 바뀌면 해당 서버 이슈가 해제되며, 무관한 입력 변경에는 남아 있습니다. 새 제출을 시작하면 이전 failure와 서버 이슈를 지운 뒤 다시 검증합니다.

제출과 별개로 받은 앱 이슈에는 `issues` prop을 사용합니다.

```vue
<FormRoot v-bind="submission" :issues="serverIssues">…</FormRoot>
```

사용자에게 보여 줄 문구는 명시적으로 작성하세요. 예기치 않은 Promise reject를 서비스 정보나 stack trace 노출 없이 안전한 `{ message }` failure로 변환하려면 `mapSubmitError`를 사용합니다.
