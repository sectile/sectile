---
title: 가상화
description: 수많은 항목의 배치와 측정, 화면 범위 조회, 스크롤 위치 보정을 하나의 상태 모델로 다룹니다.
---

# 가상화

`@sectile/virtual`은 수많은 항목을 **어디에 놓고, 지금 어느 항목을 그릴지** 계산하는 프레임워크 독립형 배치 엔진입니다. 앱이 안정적인 ID와 항목 순서, 예상 크기 또는 좌표, 화면 영역을 넘기면 전체 스크롤 크기와 화면 주변에 배치할 항목의 좌표를 `VirtualLayoutPlan`으로 돌려줍니다.

항목을 실제로 잰 크기가 예상과 다르거나 목록 앞쪽에서 삽입·삭제·이동이 일어나면 새 배치 상태와 `scrollDelta`를 계산합니다. 앱은 이 보정값만큼 스크롤을 옮겨 사용자가 읽던 항목을 같은 자리에 둘 수 있습니다. 선형 목록, 행·열 격자, 벽돌형 카드, 자유 좌표 화면이 같은 조회·측정·변경 계약을 사용하고, DOM과 Vue 연결은 이 계산을 브라우저 측정과 화면 출력으로 이어 줍니다.

## Sectile Virtual이 강한 이유

<VirtualStrengthOverview />

## 설치

```sh
pnpm add @sectile/core @sectile/virtual
```

```ts
import { createExtentIndex } from '@sectile/virtual/extent-index'
import { createLinearLayout } from '@sectile/virtual/linear-layout'
```

## 다른 가상화 라이브러리와 비교하면

기본 목록 가상화만 필요하다면 선택지는 많습니다. TanStack Virtual은 헤드리스 목록을 폭넓게 다루고, react-window는 정형적인 React 목록과 격자를 간결하게 만듭니다. React Virtuoso는 완성도 높은 목록 동작을 컴포넌트로 제공하고, react-virtualized는 오래된 React 앱에서 쓸 수 있는 부품이 많습니다. Virtua는 여러 프레임워크를 지원하며, Vue Virtual Scroller는 Vue 목록에 바로 연결하기 쉽습니다.

Sectile의 차이는 기능 하나가 아니라 **배치 상태가 담당하는 범위**에 있습니다. 목록의 동적 높이와 위치 보정뿐 아니라 격자, 벽돌형 카드, 자유 좌표 화면까지 같은 상태 전이로 다룹니다.

<VirtualLibraryComparison />

고정 높이 목록의 브라우저 속도는 별도로 비교했습니다. 준비된 데이터를 처음 표시하는 시간은 Sectile이 가장 짧았고, 스크롤 중앙값은 TanStack Virtual과 react-virtualized가 더 짧았습니다. 버전, 실행 조건, 원본 수치와 비교 범위는 [가상화 벤치마크](/ko/packages/virtual/benchmark)에 공개합니다.

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
7. [벤치마크](virtual/benchmark.md): 주요 라이브러리와 같은 목록을 실행한 결과와 측정 범위.

배치 상태를 다른 작업 스레드로 넘기거나 저장할 때는 배치 방식마다 제공하는 `snapshot*Layout()`과 `restore*Layout()`을 사용합니다. 이 공개 형식이 내부 구조가 바뀌어도 저장과 복원을 이어 주는 경계가 됩니다.
