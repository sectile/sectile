---
title: 격자·벽돌형·자유 좌표
description: 가로와 세로가 큰 격자, 높이가 다른 카드, 넓은 좌표 공간을 가상화합니다.
---

# 격자·벽돌형·자유 좌표

배치 방식은 화면이 가진 구조에 맞춰 고릅니다. 각 예제의 코드 탭은 상단 **사용 환경** 설정을 따릅니다.

## 트랙 격자

행과 열이 모두 독립적으로 큰 화면에는 트랙 격자를 사용합니다. 아래 예제는 **300개 행 × 300개 열**, 총 90,000개 셀을 같은 비중으로 만들었습니다. 가로와 세로를 모두 스크롤해도 현재 viewport와 overscan에 들어온 셀만 DOM에 존재합니다.

<VirtualExample kind="grid" />

트랙 격자는 행 높이와 열 너비를 각각 관리합니다. 셀이 여러 행이나 열을 차지하는 병합 영역도 같은 좌표계에 둘 수 있습니다. Vue의 `VirtualizerRoot`에는 `trackGridLayoutStrategy`를 연결합니다.

상품 카드처럼 세로 방향으로만 이어지는 화면에는 `VirtualGrid`가 더 간단합니다. `{ kind: 'responsive', minExtent: 180, maxCount: 6, gap: 12 }` 같은 반응형 `lanePolicy`를 사용하면 실제 surface 너비에서 lane geometry를 계산합니다.

## 벽돌형

높이가 다른 카드를 빈 공간이 적도록 여러 열에 배치합니다. 아래 예제는 30,000개 카드의 실제 DOM 높이를 측정하고, viewport 주변의 카드만 만듭니다.

<VirtualExample kind="masonry" />

`VirtualMasonry`도 Grid와 같은 `lanePolicy`를 사용합니다. mount된 카드 높이로 layout을 보정하려면 estimated 또는 measured `sizePolicy`를 사용하고, 모든 카드 크기가 같다면 fixed policy를 선택합니다.

## 자유 좌표

다이어그램과 편집기처럼 앱이 각 항목의 x·y 좌표와 크기를 이미 가지고 있을 때 사용합니다. 아래 예제는 40,000개의 서비스 노드를 불규칙한 군집으로 배치했습니다. 행·열 규칙이나 고정된 노드 크기 없이, 가로와 세로 어느 방향으로 이동해도 viewport와 겹치는 노드만 조회합니다.

<VirtualExample kind="spatial" />

`VirtualSpatial`에는 `getRect`로 x, y, 너비, 높이를 전달합니다. 그 크기를 계속 앱이 소유하면 `sizeOwnership: 'declared'`, x·y는 앱이 소유하되 mount된 DOM 크기로 width·height를 바꾸려면 `'mounted'`를 사용합니다. surface가 이동하는 것만으로 application rectangle을 다시 쓰지는 않습니다.

## 선택 기준

| 자료가 가진 구조 | 배치 |
| --- | --- |
| 순서와 항목 크기 | [선형](linear.md) |
| 독립적인 행과 열 | 트랙 격자 |
| 순서와 서로 다른 카드 높이 | 벽돌형 |
| 이미 정해진 x·y 사각형 | 자유 좌표 |
