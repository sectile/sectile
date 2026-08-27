---
title: 코어 구조와 상태
description: 순서, 범위, 격자, 계층과 현재 위치, 선택, 펼침, 텍스트 상태를 조합합니다.
---

# 코어 구조와 상태

Core는 **무엇이 존재하는지**와 **사용자가 그것을 어떻게 다루는지**를 분리합니다.

| 구조 | 답하는 질문 |
| --- | --- |
| 순서 | 어떤 ID가 어떤 순서로 있는가? |
| 범위 | 두 경계 사이에서 어떤 단계값이 유효한가? |
| 격자 | 어떤 ID가 몇 번째 행과 열을 차지하는가? |
| 계층 | 부모와 자식은 누구이며, 펼쳤을 때 무엇이 보이는가? |

현재 위치, 선택, 펼침, 텍스트 편집은 서로 독립된 상태입니다. 목록 상자는 순서에 현재 위치와 선택을 조합합니다. 계층 보기는 여기에 계층과 펼침을 더합니다. 이 작은 상태를 조합하면 같은 선택 규칙을 여러 컴포넌트에서 재사용할 수 있습니다.

```ts
import { createSequence } from '@sectile/core/sequence'
import { createRange } from '@sectile/core/range'

const tabs = createSequence(['overview', 'activity', 'settings'])
const volume = createRange({ origin: '0', step: '5', count: 20 })
```

## 책임 경계

Core 구조는 논리 ID와 유효성을 맡습니다. 비동기 자료의 적재 범위는 `@sectile/core/collection-window`, 화면에 그릴 화소 좌표는 `@sectile/virtual`, 표시 문구와 DOM 노드는 앱과 실행 환경에서 관리합니다.

형식적인 전체 정의는 [코어 이론](/ko/theory/structures)에서 확인할 수 있습니다.
