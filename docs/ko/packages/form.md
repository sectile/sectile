---
title: Form
description: 네이티브 HTML 컨트롤과 Sectile 컴포넌트로 접근 가능한 폼을 만들고 검증과 제출을 연결합니다.
---

# Form

Sectile Form은 따로 떨어진 입력을 하나의 접근 가능한 폼으로 묶습니다. 레이블과 도움말, 검증, 오류, 제출, reset, `dirty`의 기준값을 함께 관리하되 입력값과 마크업은 입력 컴포넌트에 남겨 둡니다. 플랫폼별 API와 효과는 선택한 연결 방식이 맡습니다.

## 연결 방식 선택

- [Vue](./form/vue/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [DOM 직접 연결](./form/dom/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

`@sectile/form`은 Form 진입점을 쓸 때만 설치합니다. Form을 쓰지 않는 앱에는 필요하지 않습니다.

## Form이 맡는 일

| 기능 | 역할 |
| --- | --- |
| 필드 | 이름, 메타데이터, 상호작용 상태, 값 기준선 |
| 검증 | 네이티브·schema·앱·서버 오류의 수명 주기 |
| 제출 | 잘못된 입력과 분리된 제출 진행 상태와 실패 |
| reset과 reinitialize | 입력 기본값으로 되돌리거나 현재 값을 새 기준으로 채택 |
| 접근성 복구 | 오류를 필드와 연결하고 잘못된 제출 뒤 포커스 복구 |

Form 도메인은 이 상태와 전이를 소유합니다. Vue와 DOM 연결은 이를 조합하고 브라우저 효과를 적용하는 서로 다른 공개 API를 제공합니다.

## 작업별 안내

| 작업 | 문서 |
| --- | --- |
| Vue 템플릿에서 폼 만들기 | [Vue 폼](./form/vue/) |
| 기존 HTML 폼 연결하기 | [DOM 폼](./form/dom/) |
| Vue에서 네이티브·Sectile 입력, 그룹, 중첩 이름 함께 쓰기 | [Vue 필드와 컨트롤](./form/vue/fields) |
| Vue에서 브라우저·schema·앱·서버 오류 표시하기 | [Vue 검증과 오류](./form/vue/validation) |
| Vue에서 파일, 비동기 저장, reset, 새 기준값 처리하기 | [Vue 제출과 값 기준 관리](./form/vue/submission) |
| 앱 컴포넌트를 Vue 폼 필드로 연결하기 | [Vue 사용자 정의 컨트롤](./form/vue/custom-controls) |
| hydration 문제 없이 Vue 폼을 서버 렌더링하기 | [Vue SSR과 hydration](./form/vue/ssr) |

[API 레퍼런스 선택](./form/api)에서 연결 방식을 고르거나 [Vue API](./form/vue/api), [DOM API](./form/dom/api)를 바로 여세요. 각 문서에는 선택한 연결 방식의 공개 API만 나옵니다.
