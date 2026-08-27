---
title: 달력과 선택기
description: 달력 구성, 이동, 한 날짜와 범위 선택, 선택기 조합을 설명합니다.
---

# 달력과 선택기

달력은 날짜를 주와 월 모양으로 펼칩니다. 선택기는 달력 상태에 입력란의 텍스트, 팝업 상태, 확정 규칙을 결합합니다.

```ts
import { createCalendarMonth } from '@sectile/temporal/calendar'
import { createDatePickerState } from '@sectile/temporal/date-picker'

const picker = createDatePickerState({
  value: { year: 2026, month: 8, day: 27 },
})

const month = createCalendarMonth(picker.view, 1)
```

`weekStartsOn`은 주를 그리는 순서를 정하고 기준 날짜 값은 그대로 유지합니다. 선택 제한이 있는 날짜도 달력 격자에 표시하면서 사용 가능 상태를 함께 제공합니다. 이동 중인 날짜, 강조한 날짜, 확정한 값, 범위 미리 보기는 서로 다른 상태입니다.

한 날짜, 범위, 월, 연도, 날짜와 시각 가운데 필요한 가장 작은 공개 경로를 고릅니다. 화면 출력과 지역별 문구는 실행 환경이 맡습니다.
