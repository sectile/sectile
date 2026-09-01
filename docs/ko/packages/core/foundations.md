---
title: 코어 기본 계약
description: ID, 결과, 변경 차수, 자원 한도를 설명합니다.
---

# 코어 기본 계약

Core는 ID, 실패, 사건의 순서, 자원 사용량을 밖에서 확인할 수 있게 합니다. 모든 컴포넌트와 기본 구조가 같은 계약을 따릅니다.

## 안정적인 ID

`StableID`는 비어 있지 않고 올바른 UTF-16인 문자열 또는 음의 0이 아닌 안전한 정수입니다. ID는 값과 타입을 그대로 비교하므로 `1`과 `'1'`은 서로 다릅니다. 같은 항목을 나타내는 동안 ID를 바꾸지 말고, 객체 ID는 상태를 만들기 전에 안정적인 문자열이나 안전한 정수로 바꿉니다.

```ts
import { createSequence } from '@sectile/core/sequence'

const products = createSequence(['product:42', 91])
```

| 경계 | ID 계약 |
| --- | --- |
| Core, Chart, DOM, Terminal | 문자열과 숫자 `StableID`를 타입까지 그대로 유지합니다. |
| Vue Chart, Virtual | 문자열과 숫자 `StableID`를 받습니다. |
| Vue 선택 컴포넌트 | 현재 공개 `value` prop은 문자열입니다. |
| DOM 속성, 폼 값, URL 같은 문자열 전용 경계 | ID를 되돌릴 수 있게 인코딩합니다. `1`과 `'1'`이 함께 올 수 있으면 `String(id)`를 사용하지 않습니다. |

문자열 ID 길이는 `maxIDCodeUnits`의 제한을 받습니다. 숫자 ID는 `Number.isSafeInteger`를 만족해야 하며 `-0`은 허용되지 않습니다. JSON은 두 기본 타입을 보존하지만 DOM 속성과 폼 값은 그렇지 않으므로, 문자열 경계에서 원래 ID를 찾는 표가 필요하면 앱 상태에 둡니다.

## 결과와 실패

실패가 공개 계약에 포함되는 순수 생성 함수와 상태 전이는 `Result`를 반환합니다. 복구할 수 있는 경계에서는 성공과 실패를 나눠 처리합니다. 형식이 정해진 실패를 예외로 바꾸려는 경우에만 `unwrap`을 사용합니다.

```ts
import { tryCreateSequence } from '@sectile/core/sequence'

const result = tryCreateSequence(['alpha', 'beta'])
if (!result.ok) report(result.error)
else use(result.value)
```

`CoreErrorCode`는 Core가 소유하는 오류 코드입니다. Temporal, Virtual, 앱은 각자 더 좁은 오류 코드를 정의합니다.

## 변경 차수와 한도

`RevisionSnapshot.revision`은 수락된 사건의 수입니다. 경계에서 값이 그대로인 사건도 수락됐다면 증가합니다. 이 값으로 사건 순서를 지키고 이전 차수의 외부 갱신을 구분합니다. 화면 출력 횟수는 실행 환경에서 따로 셉니다.

`maxItems`, `maxIDCodeUnits` 같은 생성 한도도 공개 계약에 포함되어 앱이 허용할 자원 범위를 지킵니다.
