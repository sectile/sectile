---
title: 필드와 컨트롤
description: Form 연결 방식 전반에서 필드 식별, 값, 메타데이터, 그룹, 컨트롤을 이해합니다.
---

# 필드와 컨트롤

Form 필드는 사용자가 답하는 하나의 값입니다. 네이티브 입력, Sectile 컴포넌트, 여러 요소로 이루어진 컨트롤 모두 필드가 될 수 있습니다. Form 모델은 식별자, 상호작용 상태, 오류, 값 기준선을 추적하고 현재 값과 마크업은 컨트롤에 남겨 둡니다.

## 연결 방식에 따라 달라지는 코드

| 필요한 작업 | Vue | DOM |
| --- | --- | --- |
| 필드 선언 | `FormField` | `registerParticipant()` 또는 초기 `participants` |
| 레이블과 오류 연결 | `FormLabel`, `FormDescription`, `FormMessage` | 기존 HTML과 participant 요소 |
| `dirty`, `touched` 읽기 | 컴포넌트 slot 또는 공개 Form 상태 | `subscribe()` |
| 사용자 정의 값 사용 | Form control composable | `getValue`, `isValueEqual` |

템플릿 예제는 [Vue 필드와 컨트롤](./vue/fields), 기존 HTML과 동적 participant는 [DOM 폼](./dom/)에서 확인하세요.

## 값은 애플리케이션에 남습니다

컨트롤을 Form에 연결해도 `v-model`, 네이티브 입력값, 애플리케이션 store를 대체하지 않습니다. Form은 현재 값과 기준값을 비교해 `dirty`를 계산합니다. `touched`는 상호작용을 따로 기록하므로 값이 기준으로 돌아온 뒤에도 `true`일 수 있습니다.

이름이 있는 네이티브 컨트롤은 Form이 메타데이터를 추적하지 않아도 브라우저 `FormData`에 포함됩니다. Form 오류, dirty 추적, 잘못된 제출 뒤 포커스 복구가 필요할 때 필드로 등록하세요.

## 필드 경로와 그룹

`email`, `['profile', 'displayName']`, `['members', 0, 'email']` 같은 경로는 검증과 구조화된 값에서 안정적인 식별자가 됩니다. 네이티브 name과 `FormData`는 브라우저 제출 규칙을 그대로 따릅니다.

radio 그룹이나 여러 요소로 된 하나의 답은 한 필드로 다룹니다. 하나의 오류가 주 필드와 관련 필드를 가리켜도 폼 요약에는 중복되지 않습니다.

다음으로 [검증과 오류](./validation) 또는 [사용자 정의 컨트롤](./custom-controls)을 확인하세요.
