---
title: Virtual
description: 긴 목록과 큰 2차원 화면에서 필요한 항목만 배치하고, 실제 크기가 달라져도 현재 스크롤 위치를 안정적으로 유지합니다.
---

# Virtual

`@sectile/virtual`은 큰 화면에서 현재 보이는 영역 주변에 어떤 항목이 필요한지 계산하고 각 항목의 위치를 정합니다. 항목 ID, 크기 정보, 배치 결과, 스크롤 보정은 Vue나 DOM과 분리되어 있습니다. 화면 환경은 현재 보이는 범위와 실제 측정값을 전달하고, 계산된 배치 결과를 화면에 반영합니다.

목록·격자·벽돌형·자유 좌표 화면을 Vue에서 바로 구성하려면 Vue 연결을 사용합니다. 애플리케이션 로직, 백그라운드 작업, 서버 렌더링, 별도의 화면 환경에서 배치 상태 자체가 필요할 때는 Virtual을 직접 사용합니다.

## 설치

설치 명령은 상단의 **연결 방식**에서 고른 환경에 맞춰 바뀝니다.

<VirtualInstall />

화면 환경과 무관한 공개 경로 전체는 [Virtual API 참조](/ko/api/virtual)에 정리되어 있습니다.

## 높이가 제각각인 긴 목록 다루기

아래 예제에는 높이가 서로 다른 행 50,000개가 있습니다. 실제로 화면에 만드는 항목은 현재 보이는 영역 주변으로 제한됩니다. 표시된 항목의 실제 높이가 예상과 달라지면 새 측정값을 반영하면서 사용자가 읽던 위치가 갑자기 밀리지 않도록 스크롤도 함께 보정합니다.

<VirtualExample kind="list" />

**사용 코드**는 상단의 **연결 방식**을 따릅니다. Vue와 DOM 연결은 브라우저의 실제 크기를 측정하고 스크롤 보정을 적용합니다. 화면 환경과 무관한 코드는 같은 배치 상태를 직접 조회합니다.

## 화면 없이 큰 목록 조회하기

배치 계산은 안정적인 ID와 초기 크기 정보에서 시작합니다. 조회 결과에는 전체 항목의 위치가 아니라 현재 보이는 범위와 주변 여유 범위(`overscan`)에 필요한 항목만 들어 있습니다.

```ts
import { createVirtualCollection } from '@sectile/virtual/collection'
import { createUniformExtentIndex } from '@sectile/virtual/extent-index'
import {
  createLinearLayout,
  queryLinearLayout,
} from '@sectile/virtual/linear-layout'

const rows = Array.from({ length: 50_000 }, (_, index) => ({
  id: `row-${index}`,
  title: `Row ${index + 1}`,
}))

const collection = createVirtualCollection(rows, row => row.id)
const extents = createUniformExtentIndex(rows.length, {
  kind: 'estimated',
  value: 44,
})

const layout = createLinearLayout(collection.domain, extents, {
  axis: 'vertical',
  gap: 8,
  crossExtent: 720,
})

const plan = queryLinearLayout(layout, {
  viewport: {
    x: 0,
    y: 12_000,
    width: 720,
    height: 640,
  },
  overscan: 240,
})

console.log(plan.contentSize)
console.log(plan.placements.map(({ id, rect }) => ({ id, rect })))
```

`plan.contentSize`는 스크롤 가능한 전체 화면 크기입니다. `plan.placements`에는 현재 보이는 범위와 그 주변 범위에 걸치는 항목만 들어 있습니다. 브라우저, 터미널, 캔버스, 백그라운드 작업처럼 결과를 소비하는 곳이 달라도 같은 배치 계획을 사용할 수 있습니다.

## 알고 있는 크기에 맞는 정책 고르기

가상 배치를 시작하려면 아직 측정하지 않은 항목의 주축 크기를 어느 정도 알아야 합니다. Vue의 상위 컴포넌트에서는 `sizePolicy`로 이 기준을 정합니다. 화면 환경과 무관한 패키지는 같은 정보를 정확한 값, 예상값, 아직 모르는 값으로 구분합니다.

| 화면에 만들기 전에 아는 정보 | Vue `sizePolicy` | 동작 |
| --- | --- | --- |
| 모든 항목의 정확한 크기가 같음 | `{ kind: 'fixed', extent }` | 주축 크기를 DOM에서 다시 측정할 필요가 없음 |
| 쓸 만한 예상 크기가 있음 | `{ kind: 'estimated', estimate }` | 아직 만들지 않은 항목은 예상값으로 배치하고, 실제 크기를 알게 되면 보정할 수 있음 |
| 화면에 만든 내용으로 초기 크기를 정해야 함 | `{ kind: 'measured' }` | 처음 화면에 만든 항목의 크기로 기준을 잡은 뒤 일반 측정을 이어감 |

줄바꿈되는 글, 이미지, 펼쳐지는 내용처럼 DOM에 따라 크기가 달라지는 항목은 화면에 만든 뒤 실제 측정값으로 예상값을 갱신할 수 있습니다. 측정 결과에는 어떤 배치 상태에서 얻은 값인지 함께 기록되므로, 이미 바뀐 배치에 오래된 측정값을 적용하지 않습니다.

## 데이터가 바뀌어도 읽던 위치 유지하기

안정적인 ID가 있으면 같은 항목을 현재 순번과 별개로 계속 추적할 수 있습니다. 현재 화면보다 앞에서 항목이 추가·삭제·이동되거나 크기가 달라지면 Virtual은 기준 항목의 이전 위치와 새 위치를 비교해 필요한 스크롤 보정값을 계산합니다.

Vue와 DOM 연결은 이 값을 실제 스크롤 영역에 적용합니다. 별도의 화면 환경에서는 같은 보정값을 받아 그 환경에 맞게 처리합니다. 컬렉션이 바뀌어도 ID가 유지된 항목은 기존 측정값을 계속 사용할 수 있습니다.

전체 갱신 순서는 [측정과 위치 유지](virtual/measurement.md)에서 확인할 수 있습니다.

## 실제 스크롤 영역 정하기

브라우저 연결에서는 Virtual 배치 모델을 바꾸지 않고 요소 스크롤 영역과 페이지 스크롤을 모두 사용할 수 있습니다. Vue에서 `scrollport`를 생략하면 컴포넌트 root가 기본 스크롤 영역이 됩니다. 일반 페이지 흐름을 사용하려면 `scrollport="document"`를 지정하고, 바깥 컨테이너가 스크롤을 소유한다면 `HTMLElement` 또는 `Document`를 직접 전달합니다. DOM 연결도 `VirtualScrollport = HTMLElement | Document`로 같은 물리 대상을 표현합니다.

고정 또는 sticky UI가 viewport를 가린다면 `viewportInsets`로 크기를 명시합니다. Sectile은 CSS에서 가림 영역을 추론하지 않습니다. 이후 Virtual 바깥의 문서 흐름이 별도 resize나 등록된 frame 신호 없이 surface를 옮겼다면 `window` 스크롤 이벤트를 다시 전달하는 대신 `refresh()`로 위치·크기 정보를 다시 측정합니다.

페이지와 외부 scrollport 예제, 브라우저 범위는 [Vue 연결](virtual/vue.md#페이지-스크롤-사용하기)과 [DOM 연결](virtual/dom.md#페이지-스크롤-사용하기)에서 확인할 수 있습니다.

## 데이터 구조에 맞는 배치 고르기

| 화면 | 배치 또는 컴포넌트 | 자세히 |
| --- | --- | --- |
| 피드, 메시지, 검색 결과, 명령 기록 | 선형 | [선형 목록](virtual/linear.md) |
| 세로로 흐르는 반응형 카드 격자 | `VirtualGrid` | [Vue 연결](virtual/vue.md#선언형-컴포넌트) |
| 행과 열이 각각 매우 큰 셀 화면 | 트랙 격자 | [격자·벽돌형·자유 좌표](virtual/layouts.md#트랙-격자) |
| 높이가 다른 카드를 여러 줄에 채우는 화면 | 벽돌형 | [격자·벽돌형·자유 좌표](virtual/layouts.md#벽돌형) |
| 애플리케이션이 각 항목의 사각형 좌표를 가진 편집기·캔버스 | 자유 좌표 | [격자·벽돌형·자유 좌표](virtual/layouts.md#자유-좌표) |

데이터 구조에 맞는 가장 단순한 배치를 사용합니다. 세로로 흐르는 상품 카드 목록이라면 행과 열을 각각 가상화할 필요가 없지만, 스프레드시트처럼 양쪽 방향이 모두 큰 화면은 두 축을 다루는 배치가 필요합니다.

## 연결 수준 고르기

Vue에서는 [`VirtualList`, `VirtualGrid`, `VirtualMasonry`, `VirtualSpatial`](virtual/vue.md)이 일반적인 화면 생성, 측정, 스크롤 보정을 처리합니다. 기존 브라우저 마크업이나 직접 만든 화면 계층에 연결할 때는 [`createVirtualizer`](virtual/dom.md)로 스크롤 영역과 콘텐츠 영역을 명시합니다. 화면 출력을 애플리케이션이 직접 맡거나 백그라운드 작업·서버에서 배치만 계산한다면 `@sectile/virtual/*` 공개 경로를 직접 사용할 수 있습니다.

## 작업별 다음 문서

- [선형 목록](virtual/linear.md) — 가변 높이 목록, 크기 정책, 컬렉션 변경, ID 기반 스크롤.
- [격자·벽돌형·자유 좌표](virtual/layouts.md) — 큰 2차원 화면과 비선형 배치.
- [측정과 위치 유지](virtual/measurement.md) — 실제 크기 반영과 스크롤 보정.
- [Vue 연결](virtual/vue.md) — 상위 컴포넌트와 세부 Vue 구성 요소.
- [DOM 연결](virtual/dom.md) — `createVirtualizer`, 요소 등록, 측정, 정리.
- [Virtual API 참조](/ko/api/virtual) — 화면 환경과 무관한 공개 경로 전체.
