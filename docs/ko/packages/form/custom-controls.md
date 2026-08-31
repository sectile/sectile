---
title: 사용자 정의 컨트롤
description: 애플리케이션 컨트롤의 값과 렌더링 API를 유지한 채 Form에 연결합니다.
---

# 사용자 정의 컨트롤

사용자 정의 컨트롤은 자체 공개 값과 렌더링 API를 유지합니다. Form 연결에 필요한 것은 안정적인 식별자, 현재 값, 동등성, 상호작용 알림, 포커스 대상이라는 participant 계약뿐입니다.

## Vue 컨트롤

`FormField` 아래에 놓일 수 있는 컴포넌트 안에서 Form control composable을 사용합니다. 이 composable은 네이티브 속성을 합치고 값과 상호작용 변경을 알리며 필드 메타데이터를 노출하지만 컴포넌트의 `v-model` 계약은 바꾸지 않습니다. `FormField` 밖에서도 컴포넌트가 평소처럼 동작해야 합니다.

네이티브 입력, 숨은 입력, input이 아닌 컨트롤 패턴은 [Vue 사용자 정의 컨트롤](./vue/custom-controls)에서 확인하세요.

## DOM 컨트롤

`registerParticipant()`로 participant를 등록합니다. `getValue`를 제공하고 객체 identity가 의미 없으면 `isValueEqual`도 제공합니다. 네이티브 `input`이나 `change` event를 내지 않는 변경 뒤에는 `refreshParticipant()`를 호출하고, 컨트롤이 페이지에서 사라질 때 반환된 정리 함수를 호출하세요.

전체 participant 수명 주기는 [DOM 폼](./dom/), 정확한 option 타입은 [DOM API](./dom/api)에서 확인하세요.
