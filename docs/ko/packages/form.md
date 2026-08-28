---
title: Form
description: 네이티브 HTML 컨트롤과 Sectile 컴포넌트로 접근 가능한 폼을 만들고 검증과 제출을 연결합니다.
---

# Form

Sectile Form은 따로 떨어진 입력을 하나의 접근 가능한 폼으로 묶습니다. 레이블과 도움말, 검증, 오류, 제출, reset, `dirty`의 기준값을 함께 관리하되 입력값과 마크업은 입력 컴포넌트에 남겨 둡니다.

## 직접 사용해 보기

이름이나 시간대를 바꾸면 폼 상태 값이 바로 달라집니다. 저장이 끝나면 `reinitialize()`가 현재 값을 새 기준으로 삼으므로 `dirty`는 다시 `false`가 됩니다.

<FormPackageExample />

아래 화면은 실제 `FormRoot` 안에서 Sectile `TextField`와 `Select`를 함께 씁니다. 전체 코드는 코드 탭에서 확인할 수 있습니다.

## 연결 방식 선택

- [Vue](./form/vue)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [DOM 직접 연결](./form/dom)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

`@sectile/form`은 Form 진입점을 쓸 때만 설치합니다. Form을 쓰지 않는 앱에는 필요하지 않습니다.

## Form이 맡는 일

| 파트 | 역할 |
| --- | --- |
| `FormRoot` | 네이티브 form 동작, 검증, 제출, 폼 전체 상태 |
| `FormField` | 레이블이 있는 값 하나, 그룹, 복합 컨트롤 |
| `FormLabel` / `FormDescription` | 필드와 연결되는 레이블과 도움말 |
| `FormMessage` / `FormSummary` | 필드별 오류와 폼 전체 오류 |
| `FormReset` / `FormSubmit` | 네이티브 reset과 submit 동작 |

`FormField`에 `name`, `required`, `disabled`, `readonly`를 적으면 참여하는 입력의 기본값이 됩니다. 입력값은 실제 입력 컴포넌트가 소유하며, 필요한 속성은 입력에서 따로 덮어쓸 수 있습니다.

## 작업별 안내

| 작업 | 문서 |
| --- | --- |
| Vue 템플릿에서 폼 만들기 | [Vue 폼](./form/vue) |
| 기존 HTML 폼 연결하기 | [DOM 폼](./form/dom) |
| 네이티브·Sectile 입력, 그룹, 중첩 이름 함께 쓰기 | [필드와 컨트롤](./form/fields) |
| 브라우저·schema·앱·서버 오류 표시하기 | [검증과 오류](./form/validation) |
| 파일, 비동기 저장, 네이티브 이동, reset, 새 기준값 처리하기 | [제출과 값 기준 관리](./form/submission) |
| 앱 컴포넌트를 `FormField`와 연결하기 | [사용자 정의 컨트롤](./form/custom-controls) |
| hydration 문제 없이 서버 렌더링하기 | [SSR과 hydration](./form/ssr) |

모든 Vue 컴포넌트와 prop, slot, 이벤트, 함수, 공개 타입은 [Form API 레퍼런스](./form/api)에서 확인할 수 있습니다.
