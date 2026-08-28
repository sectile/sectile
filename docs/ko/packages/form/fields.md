---
title: 필드와 컨트롤
description: 네이티브 입력, Sectile 컴포넌트, 그룹, 중첩 이름, 외부 컨트롤을 한 폼에서 사용합니다.
---

# 필드와 컨트롤

`FormField` 하나는 사용자가 답하는 값 하나를 나타냅니다. 하위 요소는 네이티브 입력, Sectile 컴포넌트, 여러 요소로 이루어진 그룹일 수 있습니다.

## 네이티브와 Sectile 컨트롤 섞기

```vue
<FormRoot v-bind="submission">
  <FormField name="fullName" required>
    <FormLabel>이름</FormLabel>
    <input autocomplete="name" />
    <FormMessage />
  </FormField>

  <FormField name="notifications">
    <FormLabel>제품 알림</FormLabel>
    <SwitchRoot value="enabled"><SwitchThumb /></SwitchRoot>
    <FormMessage />
  </FormField>

  <FormField name="team">
    <FormLabel>팀</FormLabel>
    <SelectRoot :items="teams">
      <SelectTrigger />
      <SelectContent>
        <SelectItem v-for="team in teams" :key="team" :value="team">
          {{ team }}
        </SelectItem>
      </SelectContent>
    </SelectRoot>
    <FormMessage />
  </FormField>
</FormRoot>
```

Sectile 컨트롤은 기존의 제어·비제어 API를 그대로 유지합니다. `FormField`로 감싸면 폼 메타데이터와 오류 표시가 추가되지만 `v-model`이나 `defaultValue`를 대체하지 않습니다.

## 중첩 필드 이름

제출 결과에 객체나 배열 구조가 필요하면 segment 배열을 사용합니다.

```vue
<FormField :name="['profile', 'displayName']">…</FormField>
<FormField :name="['members', 0, 'email']">…</FormField>
```

| 필드 경로 | 네이티브 이름 | 구조화 값 |
| --- | --- | --- |
| `email` | `email` | `values.email` |
| `['profile', 'displayName']` | `profile.displayName` | `values.profile.displayName` |
| `['members', 0, 'email']` | `members[0].email` | `values.members[0].email` |

반복 이름이나 파일에는 네이티브 `FormData`가 더 알맞습니다. 애플리케이션에 타입이 있는 객체가 필요하면 schema를 통과한 `values`를 사용하세요.

## Radio와 checkbox 그룹

서로 관련된 네이티브 그룹은 `FormField` 하나로 감쌉니다. 어떤 컨트롤이 제출되는지는 브라우저 규칙을 그대로 따릅니다.

```vue
<FormField name="plan" required as="fieldset">
  <FormLabel as="legend">요금제</FormLabel>

  <label><input type="radio" value="free" /> 무료</label>
  <label><input type="radio" value="pro" /> 프로</label>
  <FormMessage />
</FormField>
```

Checkbox 그룹도 같은 구조를 사용합니다. 특정 선택지 자체가 필수일 때만 해당 네이티브 checkbox에 `required`를 지정하세요.

## `FormField` 없이 이름 있는 컨트롤 사용하기

`FormRoot` 바로 아래의 일반적인 이름 있는 입력도 정상적으로 제출됩니다.

```vue
<FormRoot v-bind="submission">
  <input name="search" />
  <FormSubmit>검색</FormSubmit>
</FormRoot>
```

연결된 레이블·설명·오류, 필드 상태, 첫 오류 포커스가 필요하면 `FormField`를 사용하세요.

## Form 요소 밖의 컨트롤

`FormRoot`에 `id`를 지정하고 다른 위치에 렌더링한 컨트롤에는 네이티브 `form` 속성을 사용합니다. Vue Teleport는 Form context를 유지하므로 teleported Sectile·사용자 정의 컨트롤에도 같은 방법을 적용할 수 있습니다.

```vue
<FormRoot id="settings-form" v-bind="submission">…</FormRoot>

<Teleport to="#page-actions">
  <FormSubmit form="settings-form">설정 저장</FormSubmit>
</Teleport>
```

필드의 하위 요소가 아직 Sectile Form을 지원하지 않는 앱 컴포넌트라면 [사용자 정의 컨트롤](./custom-controls)을 참고하세요.
