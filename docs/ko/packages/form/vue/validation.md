---
title: 검증과 오류
description: Vue 폼에서 브라우저 제약 조건, 앱 검증, 스키마, 서버 오류를 접근 가능한 메시지로 표시합니다.
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

Form의 `novalidate`와 제출 버튼의 `formnovalidate`는 기존 HTML 의미를 유지합니다. 네이티브 검증을 건너뛰어도 앱과 스키마 검증은 실행할 수 있습니다.

## 검증 실패 뒤 포커스 이동

제출 검증에 실패하면 Form은 렌더링된 순서에서 가장 앞에 있는 유효하지 않은 주 필드로 포커스를 옮깁니다. 검증 함수가 이슈를 어떤 순서로 반환했는지는 포커스 순서에 영향을 주지 않습니다. 등록된 주 필드가 없는 이슈만 있다면 관련 필드 중 가장 앞에 있는 필드로 이동합니다.

해당 필드가 fieldset을 포함한다면 [Radio와 checkbox 그룹](./fields#radio와-checkbox-그룹)에 설명된 규칙으로 그룹 안의 컨트롤을 선택합니다.

## 오류 요약 표시하기

하나의 이슈가 여러 필드를 유효하지 않게 만들어도 `FormSummary`에는 한 번만 표시됩니다.

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

슬롯에는 `validation`과 `valid`도 함께 제공됩니다. 사용자 슬롯이 없으면 `FormSummary`가 제출 실패 메시지를 먼저 표시한 뒤 현재 이슈의 메시지를 하나씩 렌더링합니다.

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

여러 값의 관계를 메시지 하나로 설명하려면 `relatedPaths`를 사용합니다. 이슈는 요약에 한 번만 나타나고, `path`와 `relatedPaths`가 가리키는 등록 필드는 모두 유효하지 않은 상태가 됩니다.

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

`path`가 가리키는 필드가 메시지를 소유하며 `FormMessage`로 표시합니다. `relatedPaths`가 가리키는 필드도 유효하지 않은 상태가 되지만 같은 메시지를 반복해서 표시하지 않고, 접근성 오류 정보를 위해 요약을 참조합니다.

상태에서는 `allIssues`가 전체 이슈를 순서대로 제공합니다. 폼 수준의 `issues`에는 등록된 주 필드가 없는 이슈가 들어갑니다. 각 필드의 `issues`에는 그 필드가 소유한 이슈가, `relatedIssues`에는 다른 필드가 소유했지만 현재 필드도 유효하지 않게 만드는 이슈가 들어갑니다. 사용자 정의 오류 요약에는 필드별 목록을 합치지 말고 `allIssues`를 사용하세요.

## Standard Schema 검증

Standard Schema를 구현한 어떤 스키마든 `defineFormSubmission()`에 전달할 수 있습니다. 스키마가 제출값을 검증하고 변환한 출력 타입은 `onSubmit`에서 추론됩니다.

```ts
const submission = defineFormSubmission({
  schema: accountSchema,
  onSubmit: ({ values }) => {
    values.accountId // accountSchema 출력에서 추론
    return saveAccount(values)
  },
})
```

경로가 있는 스키마 오류는 해당 `FormMessage`에, 그 밖의 오류는 `FormSummary`에 표시됩니다.

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

`failure`는 `submission.status`를 `failed`로 바꾸지만 폼이나 필드를 유효하지 않게 만들지는 않습니다. 서버 이슈는 주 필드와 관련 필드를 유효하지 않은 상태로 만듭니다. 연결된 필드 중 하나의 값이 실제로 바뀌면 해당 서버 이슈가 해제되며, 무관한 입력 변경에는 남아 있습니다. 새 제출을 시작하면 이전 `failure`와 서버 이슈를 지운 뒤 다시 검증합니다.

제출과 별개로 받은 앱 이슈에는 `issues` prop을 사용합니다.

```vue
<FormRoot v-bind="submission" :issues="serverIssues">…</FormRoot>
```

사용자에게 보여 줄 문구는 명시적으로 작성하세요. 예기치 않게 거부된 Promise를 서비스 정보나 스택 추적을 노출하지 않는 안전한 `{ message }` 형태로 바꾸려면 `mapSubmitError`를 사용합니다.
