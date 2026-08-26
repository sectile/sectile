---
title: 가상화
description: 동적 geometry, layout strategy, anchor, host scheduling 계약.
---

# 가상화

Sectile은 논리 collection, 렌더링 geometry, 적재 데이터를 서로 다른 domain으로 관리합니다.

```text
Sequence ID/순서 ────────┐
ExtentIndex 측정값 ──────┼─ Layout strategy ── LayoutPlan ── host renderer
Sparse region/rect ──────┘         │
                                   └─ mutation 이후 scrollDelta

CollectionWindow ── 비동기 데이터 적재만 담당
```

ID와 순서의 기준은 `@sectile/core/sequence`입니다. `@sectile/virtual/extent-index`는 exact, estimated, fallback geometry를 persistent prefix tree에 저장합니다. Layout strategy는 이 논리 입력을 renderer-neutral `VirtualLayoutPlan`으로 바꿉니다. `CollectionWindow`는 비동기 데이터 적재만 관리하며 render window와 loaded-data window를 같은 상태로 취급하지 않습니다.

## 공통 layout 계약

모든 strategy는 2차원 viewport와 네 방향의 독립적인 overscan을 받습니다. Plan은 content size, render bounds, placement, visibility, generation, 안정적인 ID anchor를 포함합니다. 측정과 domain mutation은 새 immutable state와 2차원 scroll delta를 반환합니다. 오래된 generation의 측정은 추측해서 적용하지 않고 거부합니다.

좌표는 실행 환경과 무관합니다. DOM read, `ResizeObserver`, scroll write, terminal 측정, animation scheduling은 host adapter가 담당합니다. 기존 state와 입력 배열은 변경하지 않습니다.

## Strategy

| Strategy | 주요 용도 | Geometry와 query 모델 |
|---|---|---|
| linear | list, feed, carousel | 세로/가로, forward/reverse, 항목별 동적 크기 |
| track grid | spreadsheet, table, schedule | 독립적인 동적 행·열, sparse/merged region, 축별 reverse |
| masonry | gallery, board | shortest-lane 또는 안정적인 round-robin, 반응형 lane geometry |
| spatial | canvas, diagram, layered editor | 겹칠 수 있는 임의 rect, 결정적인 z-order, packed spatial index |

Track grid의 저장량은 행, 열, 선언된 region 수에 비례합니다. `rows × columns` 크기의 cell 배열을 만들지 않습니다. Spreadsheet의 빈 cell은 plan이 반환한 행·열 범위에서 host가 투영하고, 병합 cell이나 실제 material cell만 sparse region으로 선언합니다. Frozen pane은 상태를 복제하지 않고 하나의 grid state에 여러 viewport query를 적용해 구성합니다.

Masonry의 `shortest` 정책은 측정값이 달라지면 뒤쪽 항목의 lane도 바뀔 수 있습니다. 균형 배치를 위한 의도된 정책입니다. 완벽한 균형보다 시각적 연속성이 중요하면 lane 소유권이 안정적인 `round-robin`을 사용합니다. 반응형 lane 수 변경은 명시적인 geometry mutation이며 anchor correction을 반환합니다.

Spatial layout은 겹침을 허용하고 `zIndex`, 선언 순서로 placement를 반환합니다. 비정형 geometry를 위한 전략이며 더 저렴한 linear나 track-grid index를 대체하지 않습니다.

## 동적 측정 cycle

1. exact, estimated, 또는 fallback이 있는 unknown extent로 시작합니다.
2. 최신 viewport로 plan을 조회합니다.
3. plan placement만 렌더링합니다.
4. 같은 plan generation으로 host 측정값을 한 번에 보고합니다.
5. 다음 paint 전에 반환된 scroll delta를 적용합니다.
6. 다음 plan을 조회합니다.

화면 anchor 앞이나 주변의 geometry가 달라지면 strategy는 같은 ID의 이전 rect와 새 rect를 비교합니다. Host는 반환된 delta를 애니메이션 없이 더합니다. 따라서 측정된 콘텐츠가 커지거나 줄고, masonry lane이 바뀌거나, grid track span이 변해도 anchor의 viewport 좌표는 유지됩니다.

Host는 scroll observation을 frame마다 합치고 read를 모두 끝낸 뒤 write를 처리해야 합니다. 항목마다 read와 write를 번갈아 실행하는 방식은 계약 밖이며 브라우저 layout batching을 깨뜨립니다.

## 브라우저와 Vue 투영

`@sectile/dom/virtual`은 브라우저 scroll element에서 이 scheduling 계약을 구현합니다. 한 animation frame 안에서 root와 item의 resize 알림을 모으고, 모든 측정값을 계산해 한 번의 semantic measurement batch로 적용한 다음, 반환된 anchor 보정을 기록하고 새 plan을 공개합니다. 사용자 정의 viewport reader와 scroll writer를 전달하면 RTL이나 일반적이지 않은 scroll surface도 정규화된 좌표로 연결할 수 있습니다. 하나의 item rect만으로 행과 열을 추론할 수 없는 병합 track grid를 위해 수동 measurement도 공개합니다.

`@sectile/vue/virtual`은 논리 collection을 소유하지 않은 채 DOM connection을 Vue로 투영합니다. `VirtualizerRoot`는 viewport connection, `VirtualizerContent`는 전체 content extent, `VirtualizerItem`은 plan이 반환한 placement 하나의 배치와 측정을 맡습니다. `asChild`로 Listbox, Combobox, Feed, Grid 또는 응용 프로그램 요소와 합성해도 해당 의미 컴포넌트에는 전체 ID domain이 계속 전달됩니다. 결정적인 `initialViewport`를 지정하면 SSR과 hydration에서 같은 초기 plan을 만들며, 생략하면 mount 뒤에 render window를 그립니다.

## Domain 변경과 데이터 적재

Linear와 masonry item mutation은 collection/reorder semantics와 같은 public `SequencePatch`를 소비합니다. Splice는 새 ID마다 초기 extent 하나를 전달하고 move는 기존 extent를 유지하며 source 제거 이후 destination index를 사용합니다. Track grid는 영향받지 않은 sparse region을 자동 이동하고 병합 region을 가르는 track splice는 거부합니다. 새 span이 필요하면 region을 원자적으로 교체합니다. Spatial update는 기존 선언 위치를 유지하고 새 ID를 뒤에 추가합니다.

Linear render 범위가 loaded range를 벗어날 때만 `collectionWindowEventForLinearPlan()`을 사용합니다. Request generation과 오래된 응답 거부는 계속 `CollectionWindow`가 담당합니다.

저장소 검증 문서는 strategy 복잡도 계약과 동일 runner benchmark 관측값을 이 공개 semantic 계약과 분리해 관리합니다.
