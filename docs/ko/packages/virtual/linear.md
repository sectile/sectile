---
title: 선형 목록
description: 높이가 서로 다른 긴 목록을 측정하고 collection 변경 뒤에도 읽던 위치를 유지합니다.
---

# 선형 목록

피드, 메시지, 검색 결과처럼 한 방향으로 이어지는 화면에는 선형 배치를 사용합니다. 세로·가로 방향, item 간격, 서로 다른 크기, ID 기준 이동을 지원합니다. placement의 cross extent도 CSS 보정값이 아니라 실제 virtual surface의 유효 크기를 사용합니다.

## 예제

아래 50,000개 행은 네 가지 높이를 반복합니다. Vue와 DOM 환경에서는 mount된 요소를 측정해 extent를 보정할 수 있고, Core와 Terminal에서는 같은 layout state를 직접 조회합니다.

<VirtualExample kind="list" />

## 크기 정책 선택

| 알고 있는 값 | Vue `sizePolicy` | 처리 방식 |
| --- | --- | --- |
| 모든 item이 같은 정확한 크기 | `{ kind: 'fixed', extent }` | main axis DOM 측정을 생략 |
| 사용할 만한 초기 예상값 | `{ kind: 'estimated', estimate }` | 예상값으로 시작하고 mount된 item을 실제 크기로 보정 |
| DOM 표본으로 초기 예상값부터 정해야 함 | `{ kind: 'measured' }` | 렌더된 item으로 bootstrap한 뒤 mount된 변화도 계속 측정 |

낮은 수준 DOM 연결에서는 `createAxisMeasurementResolver('vertical')` 또는 `'horizontal'`을 `createVirtualizer`에 전달합니다. Core에서는 exact, estimated, unknown extent로 같은 상태를 표현합니다.

## 항목 변경

배열에 항목을 넣거나 삭제하거나 옮길 때 안정적인 ID를 유지합니다. Sectile은 남아 있는 ID의 측정값을 이어 쓰고, viewport 앞쪽에서 생긴 변화만큼 anchor 위치를 보정합니다.

원하는 item으로 이동할 때는 Vue의 `scrollToID()`, DOM 연결의 `scrollTo()`, Core의 `linearScrollTarget()`을 사용합니다.
