---
title: 가상화
description: 동적 크기 항목의 자동 측정, 삽입·삭제·이동 뒤 위치 보정, 네 가지 배치 방식을 하나의 상태 모델로 다룹니다.
---

# 가상화

`@sectile/virtual`은 크기와 순서가 계속 바뀌는 대규모 화면의 배치를 관리합니다. 목록 앞에 항목을 넣고, 행을 펼치고, 격자의 열 수를 바꿔도 새 좌표와 그릴 범위를 계산합니다. 함께 반환하는 `scrollDelta`는 변경 전 기준 항목의 화면 좌표를 유지하는 보정값입니다.

Vue의 `VirtualList`, `VirtualGrid`, `VirtualMasonry`, `VirtualSpatial`은 실제 요소를 자동으로 측정합니다. `@sectile/dom/virtual`과 `@sectile/vue/virtual`이 실제 높이를 읽고 Sectile이 달라진 구간부터 배치를 갱신합니다. 목록, 반응형 격자, 벽돌형 카드, 자유 좌표 화면이 이 측정·변경 흐름을 함께 사용합니다.

## Sectile Virtual의 강점

<VirtualStrengthOverview />

## 설치

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
```

## 검증 범위

브라우저 벤치마크는 고정 높이와 동적 높이를 나눠 초기 렌더와 스크롤을 측정합니다. 삽입·이동·삭제·높이 변경 뒤 정상 화면에 도달하는 시간과 화면 오류도 함께 기록합니다. 최신 수치, 실패 조건, 실행 방법은 [가상화 벤치마크](/ko/packages/virtual/benchmark)에 공개합니다.

## 크기가 계속 달라지는 목록

완료된 기록까지 쌓인 고객 문의 화면을 예로 들었습니다. 각 행에는 선택, 상태, 태그, 요약, 처리 내역이 들어가며 내용에 따라 높이가 달라집니다. 행을 직접 펼치고 접으면 브라우저가 새 높이를 재고 배치에 반영합니다. 목록을 내린 상태에서 앞쪽 기록을 추가하거나 삭제하고 순서를 바꿔도 읽던 행의 화면 위치가 유지됩니다.

<VirtualWindowLab />

## 배치 방식이 네 개인 이유

가상화에는 두 가지 일이 있습니다. 먼저 항목의 좌표를 계산하고, 그다음 현재 화면과 겹치는 항목을 찾습니다. 목록·행열 격자·벽돌형 배치는 순서와 크기를 받아 좌표까지 계산합니다. 자유 좌표 배치는 앱이 이미 가진 사각형 좌표를 받아 화면과 겹치는 항목을 찾습니다.

따라서 자유 좌표 배치 하나로 목록을 구현할 수도 있지만, 이 경우 앱이 모든 행의 좌표 계산, 크기 변경 뒤의 재배치, 기준 항목 보정을 직접 맡게 됩니다. 화면 구조에 맞는 전용 배치를 쓰면 앱은 순서와 측정값만 전달하면 됩니다.

아래 예제에는 방식마다 9만~10만 개의 항목이 들어 있습니다. 방식을 바꾸면 Sectile이 계산하는 값, 앱이 제공하는 값, 화면에 실제로 만들어진 항목 수가 함께 바뀝니다.

<VirtualStrategyLab />

## 읽는 순서

1. [동작 원리](virtual/concepts.md): ID, 크기와 좌표, 그릴 범위, 적재 범위.
2. [선형 목록](virtual/linear.md): 달라지는 행 높이, 화면 밖 준비 범위, 스크롤, 항목 변경.
3. [격자·카드 모음·자유 배치](virtual/layouts.md): 화면에 필요한 기능을 가장 단순하게 구현하는 방법.
4. [측정과 기준 항목 유지](virtual/measurement.md): 오래된 측정값 구분과 스크롤 위치 유지.
5. [DOM 연결](virtual/dom.md): 브라우저 작업 순서, 읽기와 쓰기, 스크롤 좌표 정규화.
6. [Vue 연결](virtual/vue.md): `useVirtualizer`와 스타일을 앱에서 정하는 Vue 구성 요소.
7. [벤치마크](virtual/benchmark.md): 초기 렌더, 스크롤, 동적 변경의 시간과 화면 안정성.

배치 상태를 다른 작업 스레드로 넘기거나 저장할 때는 배치 방식마다 제공하는 `snapshot*Layout()`과 `restore*Layout()`을 사용합니다. 이 공개 형식이 내부 구조가 바뀌어도 저장과 복원을 이어 주는 경계가 됩니다.
