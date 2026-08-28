---
title: 핵심 개념
description: viewport, overscan, placement, anchor 네 가지 값으로 가상화 흐름을 이해합니다.
---

# 핵심 개념

Sectile Virtual은 네 가지 값으로 화면을 계산합니다.

| 값 | 의미 |
| --- | --- |
| `viewport` | 사용자가 지금 보는 x·y 위치와 너비·높이 |
| `overscan` | viewport 밖에서 미리 준비할 거리 |
| `placement` | 화면에 만들 항목의 ID와 사각형 좌표 |
| `anchor` | 변경 전후에 화면 위치를 유지할 기준 항목 |

## 한 번의 갱신

1. 현재 viewport와 overscan으로 배치를 조회합니다.
2. 반환된 placement만 화면에 만듭니다.
3. 실행 환경이 실제 요소의 크기를 측정합니다.
4. Sectile이 달라진 크기와 뒤쪽 좌표를 갱신합니다.
5. anchor의 이전 좌표와 새 좌표 차이만큼 스크롤을 보정합니다.

전체 데이터 수는 placement 수와 무관합니다. 목록 50,000개나 격자 300 × 300개를 넣어도 현재 viewport 주변의 항목만 결과에 들어갑니다.

## 상태와 화면의 역할

`@sectile/virtual` 상태는 ID, 순서, 크기와 좌표를 관리합니다. DOM과 Vue 연결은 viewport를 읽고, placement를 렌더링하고, 실제 크기와 스크롤 값을 다시 전달합니다. 같은 상태를 브라우저, 서버, worker에서 조회할 수 있습니다.

배치 상태를 저장하거나 다른 실행 영역으로 옮길 때는 각 배치의 `snapshot*Layout()`과 `restore*Layout()`을 사용합니다.
