---
title: 결과가 항상 같은 날짜 화면
description: 기준 날짜, 실행 환경 기본값, 서버 렌더링과 화면 연결 시점을 설명합니다.
---

# 결과가 항상 같은 날짜 화면

초기 선택값이 비어 있는 달력은 `referenceDate`가 속한 달을 먼저 보여줍니다. 앱이 전달한 기준 날짜가 서버와 브라우저의 공통 기준이 됩니다.

```ts
import { createDatePickerState } from '@sectile/temporal/date-picker'

const state = createDatePickerState({
  referenceDate: { year: 2026, month: 8, day: 27 },
})
```

서버와 브라우저에 같은 `referenceDate`를 전달하면 처음 표시하는 달도 같아집니다.

DOM과 Terminal 연결 함수는 기준 날짜를 생략했을 때 실행 환경의 오늘 날짜를 넣을 수 있습니다. Vue 선택기 루트와 `HostProvider`에는 기준 날짜를 직접 전달할 수 있습니다. 브라우저에서만 실행되는 화면은 편의 기본값을 써도 되지만 테스트, 저장된 화면, 작업자 스레드, 서버 렌더링에는 고정된 값을 전달해야 합니다.

기준 날짜는 초기 화면을 정합니다. 선택된 값이 있으면 해당 날짜가 우선하며, 날짜가 바뀌는 시점은 앱이 새 기준 날짜를 전달해 결정합니다.
