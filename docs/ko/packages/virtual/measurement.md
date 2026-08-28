---
title: 측정과 위치 유지
description: 실제 크기를 반영하고, 최신 측정만 받아들이며, 기준 항목의 화면 위치를 유지합니다.
---

# 측정과 위치 유지

내용 줄 수, 이미지 비율, 펼침 상태처럼 DOM이 결정하는 크기는 렌더 후에 알 수 있습니다. Sectile의 DOM과 Vue 연결은 `ResizeObserver`로 변화를 모아 한 번에 배치 상태에 반영합니다.

## 처리 순서

1. 현재 viewport의 placement를 렌더링합니다.
2. 렌더된 요소의 크기를 함께 읽습니다.
3. 같은 배치 세대의 측정값을 한 묶음으로 적용합니다.
4. 달라진 구간부터 좌표를 갱신합니다.
5. 다음 화면을 그리기 전에 `scrollDelta`를 적용합니다.

`generation`은 측정이 어느 배치에서 시작됐는지 구분합니다. 현재 배치와 generation이 일치하는 측정만 상태에 반영합니다.

## anchor와 `scrollDelta`

anchor는 viewport 안에서 기준이 되는 안정적인 ID와 상대 위치입니다. 목록 앞쪽의 행 높이가 바뀌거나 항목이 추가되면 같은 ID의 이전 좌표와 새 좌표를 비교합니다. 그 차이가 `scrollDelta`이며 DOM 연결이 실제 스크롤 값에 적용합니다.

Vue의 `VirtualList`, `VirtualGrid`, `VirtualMasonry`, `VirtualSpatial`은 이 흐름을 포함합니다. 낮은 수준 API에서는 `measure()`와 반환된 상태·`scrollDelta`를 같은 화면 갱신 안에서 처리합니다.
