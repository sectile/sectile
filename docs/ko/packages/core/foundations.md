---
title: 코어 기본 계약
description: ID, 결과, 변경 차수, 자원 한도를 설명합니다.
---

# 코어 기본 계약

Core는 ID, 실패, 사건의 순서, 자원 사용량을 밖에서 확인할 수 있게 합니다. 모든 컴포넌트와 기본 구조가 같은 계약을 따릅니다.

## 안정적인 ID

`StableID`는 문자열입니다. 숫자나 객체 ID는 상태를 만들기 전에 충돌을 피한 안정적인 문자열로 바꿉니다. 원래 값을 찾기 위한 표는 앱 상태에 둡니다.

```ts
import { createSequence } from '@sectile/core/sequence'

const products = createSequence(['product:42', 'product:91'])
```

같은 문자열 ID를 직렬화, DOM 속성, 터미널 명령, 프레임워크 키에서 그대로 사용할 수 있습니다.

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
