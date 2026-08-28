---
title: 날짜와 시간
description: 기준 날짜를 명시해 달력 날짜, 하루 안의 시각, 달력과 선택기 규칙을 계산합니다.
---

# 날짜와 시간

`@sectile/temporal`은 실행 환경과 무관한 **달력 날짜**와 **하루 안의 시각**을 다룹니다. 날짜·시간 입력란, 범위, 달력, 선택기 규칙은 Core의 공개 계약 위에 구성됩니다.

```sh
pnpm add @sectile/core @sectile/temporal
```

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

## 값의 범위와 실행 환경의 역할

Temporal은 `{ year, month, day }` 모양의 ISO 그레고리력 날짜와 `{ hour, minute, second }` 모양의 하루 안의 시각을 값으로 사용합니다. 시간대가 붙은 특정 순간은 앱에서 이 값으로 변환해 전달하고, 지역에 맞춘 표시는 실행 환경의 국제화 기능으로 처리합니다.

달력과 선택기는 앱이 전달한 `referenceDate`를 오늘의 기준으로 삼습니다. 서버와 브라우저에 같은 기준 날짜를 전달하면 첫 화면과 연결 뒤의 화면이 일치합니다.

## 읽는 순서

1. [값과 입력란](temporal/values.md): 기준 값, 입력 해석의 경계, 날짜·시간 입력란.
2. [달력과 선택기](temporal/calendars.md): 표시 월, 선택, 범위, 이동.
3. [결정적인 화면 생성](temporal/determinism.md): `referenceDate`, 서버 렌더링, 화면 연결 시점, 실행 환경 기본값.

DOM과 Terminal 연결 패키지는 실행 환경의 오늘 날짜를 `referenceDate`로 전달할 수 있습니다. 서버에서 화면을 만들 때는 요청 시점에 정한 기준 날짜를 브라우저까지 이어서 사용합니다.

브라우저 연결은 `@sectile/dom/temporal/*`와 `@sectile/vue/temporal/*` 아래의 세분화된 선택 진입점으로 제공됩니다. `@sectile/vue/temporal/temporal-provider`의 `TemporalProvider`는 하위 영역에 하나의 `referenceDate`를 공유합니다.
