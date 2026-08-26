# 날짜와 시간

`@sectile/temporal`은 실행 환경과 무관한 civil date, wall-clock time, range field, calendar projection, picker 상태 기계를 소유합니다.

Canonical domain은 ISO/Gregorian plain civil date(`year`, `month`, `day`)와
timezone이 없는 wall-clock time입니다. instant, timezone database, 비 ISO calendar
system은 다루지 않습니다. Locale별 편집·표시는 canonical value가 아니라 host codec의
책임입니다.

```sh
pnpm add @sectile/core @sectile/temporal
```

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

공개된 `@sectile/core` 계약에만 의존합니다. locale formatting, timezone database, DOM, terminal, Vue 동작은 포함하지 않습니다.

빈 semantic calendar는 숨은 clock을 읽지 않습니다. 값과 highlight가 없으면
`referenceDate`를 전달합니다.

```ts
createDatePickerState({ referenceDate: { year: 2026, month: 8, day: 26 } })
```

DOM과 terminal adapter는 기본으로 host의 현재 civil date를 주입합니다. Vue picker
root와 `HostProvider`에서도 `referenceDate`를 받을 수 있습니다. SSR에서는 서버와
클라이언트에 같은 날짜를 전달해야 합니다.
