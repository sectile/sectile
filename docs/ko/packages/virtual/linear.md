---
title: 선형 목록
description: 높이가 서로 다른 긴 목록을 자동 측정하고 변경 뒤에도 읽던 위치를 유지합니다.
---

# 선형 목록

피드, 메시지, 검색 결과처럼 한 방향으로 이어지는 화면에는 선형 배치를 사용합니다. 세로·가로 방향, 항목 간격, 서로 다른 크기, ID 기준 이동을 지원합니다.

## 예제

아래 50,000개 행은 네 가지 높이를 반복합니다. Vue와 DOM 환경에서는 실제 요소의 높이가 자동으로 측정됩니다. Core와 Terminal 환경에서는 같은 viewport 조회 결과를 확인할 수 있습니다.

<VirtualExample kind="list" />

## 크기 선택

| 알고 있는 값 | Vue 속성 | 처리 방식 |
| --- | --- | --- |
| 실제 DOM 크기만 사용 | 생략 | 첫 렌더 범위를 측정한 뒤 그 표본으로 가상 배치를 생성 |
| 대략적인 시작 크기 | `estimateSize` | 예상값으로 시작하고 실제 크기로 갱신 |
| 모든 항목의 정확한 고정 크기 | `itemSize` | 측정을 생략하고 고정 크기로 계산 |

DOM 연결에서는 `createAxisMeasurementResolver('vertical')` 또는 `'horizontal'`을 `createVirtualizer`에 전달합니다. Core에서는 `unknown`, `estimated`, `exact` extent로 같은 선택을 표현합니다.

## 항목 변경

배열에 항목을 넣거나 삭제하거나 옮길 때 안정적인 ID를 유지합니다. Sectile은 남아 있는 ID의 측정값을 이어 쓰고, viewport 앞쪽에서 생긴 변화만큼 anchor 위치를 보정합니다.

원하는 항목으로 이동할 때는 Vue의 `scrollTo()`, DOM 연결의 `scrollTo()`, Core의 `linearScrollTarget()`을 사용합니다.
