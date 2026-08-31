---
title: Form
description: 네이티브 HTML 컨트롤과 Sectile 컴포넌트로 접근 가능한 폼을 만들고 검증과 제출을 연결합니다.
---

# Form

`@sectile/form`은 Vue와 DOM 연결이 함께 사용하는 렌더러 독립적인 폼 모델입니다. 필드 식별, 검증, 오류, 제출, reset, `dirty`의 기준값을 조정하되 입력값과 마크업은 입력 컴포넌트에 남겨 둡니다.

## 애플리케이션에 연결하기

- [Vue](./form/vue/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom @sectile/vue vue
  ```

- [DOM 직접 연결](./form/dom/)

  ```sh
  pnpm add @sectile/core @sectile/form @sectile/dom
  ```

Vue와 DOM은 서로 다른 Form 제품이 아니라 연결 방법입니다. 둘 중 한 Form 진입점을 쓸 때만 `@sectile/form`을 설치하세요. 다른 Sectile 컴포넌트에는 필요하지 않습니다.

## Form이 맡는 일

| 기능 | 역할 |
| --- | --- |
| 필드 | 이름, 메타데이터, 상호작용 상태, 값 기준선 |
| 검증 | 네이티브·schema·앱·서버 오류의 수명 주기 |
| 제출 | 잘못된 입력과 분리된 제출 진행 상태와 실패 |
| reset과 reinitialize | 입력 기본값으로 되돌리거나 현재 값을 새 기준으로 채택 |
| 접근성 복구 | 오류를 필드와 연결하고 잘못된 제출 뒤 포커스 복구 |

Form 도메인은 이 상태와 전이를 소유합니다. Vue는 컴포넌트를 렌더링하고 프레임워크 수명 주기에 맞는 효과를 적용합니다. DOM은 같은 모델을 기존 HTML에 연결합니다. 스타일, 입력값, 데이터 저장, 제품별 규칙은 애플리케이션에 남습니다.

## 작업별 안내

| 작업 | 문서 |
| --- | --- |
| Vue 템플릿에서 폼 만들기 | [Vue 폼](./form/vue/) |
| 기존 HTML 폼 연결하기 | [DOM 폼](./form/dom/) |
| 네이티브 입력, Sectile 컨트롤, 그룹, 필드 식별 이해하기 | [필드와 컨트롤](./form/fields) |
| 브라우저·schema·앱·서버 오류 함께 처리하기 | [검증과 오류](./form/validation) |
| 파일, 비동기 저장, reset, 새 기준값 처리하기 | [제출과 값 기준 관리](./form/submission) |
| 애플리케이션이 만든 컨트롤 연결하기 | [사용자 정의 컨트롤](./form/custom-controls) |
| hydration 문제 없이 Vue 폼을 서버 렌더링하기 | [SSR과 hydration](./form/ssr) |

가이드는 공통 동작을 먼저 설명하고 코드가 달라지는 지점에서 실행 환경별 문서로 연결합니다. 정확한 export는 [API 레퍼런스 선택](./form/api), [Vue API](./form/vue/api), [DOM API](./form/dom/api)에서 확인하세요.
