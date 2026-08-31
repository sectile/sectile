---
title: 제출과 값 기준 관리
description: 네이티브·관리형 제출, 파일, 실패, reset, 새 값 기준선을 처리합니다.
---

# 제출과 값 기준 관리

Form은 브라우저의 기본 제출 의미를 유지하고, JavaScript가 저장을 맡을 때 관리형 경로를 추가합니다.

## 네이티브 제출과 관리형 제출

`onSubmit`을 생략하면 `action`, `method`, `enctype`, `target`, 제출 버튼의 덮어쓰기 속성을 브라우저가 그대로 처리합니다. 비동기 저장이 필요하면 `onSubmit`을 제공합니다. 관리형 callback은 네이티브 `FormData`, 누른 submitter, schema가 변환한 구조화 값을 받습니다.

파일, 반복 name, checkbox·radio의 생략, submitter 값에는 `FormData`를 우선하세요. 애플리케이션에 검증된 타입 객체가 필요하면 schema 출력을 사용합니다.

Form은 submitting, succeeded, failed 결과를 기록합니다. 요청이 실패하면 기존 dirty 기준선을 유지합니다. 성공한 handler에서 `reinitialize()`를 요청하면 현재 화면의 값을 새 저장 기준으로 채택합니다.

## reset과 reinitialize는 다릅니다

- `reset()`은 컨트롤을 기본값으로 되돌리고 Form 상태를 비웁니다.
- `reinitialize()`는 현재 컨트롤 값을 화면에 둔 채 새 기준값으로 채택합니다.

둘 다 기본적으로 수명 주기 메타데이터를 지웁니다. 제품에 필요하면 reinitialize에서 일부 상태 그룹을 유지할 수 있습니다.

컴포넌트 예제는 [Vue 제출과 값 기준 관리](./vue/submission), 기존 `HTMLFormElement` 연결은 [DOM 폼](./dom/)에서 확인하세요.
