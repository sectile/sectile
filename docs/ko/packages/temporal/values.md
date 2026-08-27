---
title: 날짜·시간 값과 입력란
description: 달력 날짜와 하루 안의 시각을 기준 값으로 다루고 표시 형식은 실행 환경에 둡니다.
---

# 날짜·시간 값과 입력란

Temporal 값은 사용자가 입력한 달력 날짜와 하루 안의 시각을 그대로 나타냅니다. 시간대와 표시 형식은 앱의 변환 경계에서 더합니다.

```ts
import { createDateValue } from '@sectile/temporal/date-field'
import { createTimeValue } from '@sectile/temporal/time-field'

const releaseDate = createDateValue(2026, 8, 27)
const openingTime = createTimeValue(9, 30)
```

달력 날짜는 연·월·일로, 하루 안의 시각은 시·분·초로 구성됩니다. 특정 순간이나 경과 시간이 필요한 앱은 시간대 또는 기준 날짜를 명시한 경계에서 이 값을 변환합니다.

## 입력란 상태

날짜와 시간 입력란은 기준 값에 Core의 텍스트 편집 상태를 결합합니다. 지역별 칸 이름, 숫자, 구분 문자, 입력 해석, 화면 표시는 실행 환경의 변환기가 맡습니다. 언어가 바뀌어도 기준 값은 그대로 유지됩니다.

두 끝점이 필요한 경우 날짜 범위를 사용합니다. 달력에 존재하는 날짜와 시작부터 끝으로 이어지는 순서를 검증하며, 검증 결과는 형식이 정해진 성공 또는 실패 값으로 반환합니다.
