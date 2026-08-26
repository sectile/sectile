# 날짜와 시간

`@sectile/temporal`은 실행 환경과 무관한 civil date, wall-clock time, range field, calendar projection, picker 상태 기계를 소유합니다.

```sh
pnpm add @sectile/core @sectile/temporal
```

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createDatePickerState } from '@sectile/temporal/date-picker'
```

공개된 `@sectile/core` 계약에만 의존합니다. locale formatting, timezone database, DOM, terminal, Vue 동작은 포함하지 않습니다.
