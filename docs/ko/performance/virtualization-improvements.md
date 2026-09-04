---
title: 가상화 확장성 개선
description: Sectile Virtual collection과 surface framing의 현재 소유권, 복잡도 상한, 브라우저 한계를 정리합니다.
---

# 가상화 확장성 개선

Sectile은 가상화 비용도 공개 동작의 일부로 다룹니다. 현재 구조는 collection identity, portable layout geometry, 브라우저 frame geometry, Vue projection을 서로 다른 소유자에게 나눠 각 계층이 의미상 필요한 최소 cardinality에 맞춰 일하도록 설계되어 있습니다.

## Collection 변경

`@sectile/virtual/collection`이 raw array projection, StableID reconciliation, size policy, lane policy를 소유합니다. 최초 raw projection은 모든 item의 ID를 한 번씩 검증하고 index를 만들어야 하므로 `O(nItem)` 시간과 보유 공간이 필요합니다.

Raw replacement에는 신뢰할 patch 정보가 없어서 동일한 prefix와 suffix를 찾는 과정이 전체 source를 볼 수 있습니다. 다만 resolver provenance가 유지되면 ID를 다시 계산하고 보유하는 범위는 실제 changed window로 제한됩니다. 따라서 계약은 `O(nItem + jChanged)` 시간, `O(jChanged)` 추가 allocation입니다. 이미 신뢰할 수 있는 patch를 소유한 호출자는 owner patch 경로를 사용해 변경되지 않은 raw identity를 다시 찾지 않아도 됩니다.

값에 따라 크기가 달라지는 policy도 같은 경계를 따릅니다. Fixed policy는 value repair가 필요 없고, estimated/measured policy는 변경된 value window만 fallback 상태로 되돌린 뒤 mount된 measurement가 exact extent를 다시 확정합니다.

## Layout geometry

Linear layout은 실제 surface의 유효 cross extent를 state에 저장합니다. 그래서 placement rect와 `contentSize`가 CSS 보정 없이 같은 geometry를 사용하며, cross extent가 의미상 같다면 기존 state를 그대로 반환합니다.

Grid와 Masonry는 `lanePolicy`를 통해 유효 surface 너비에서 lane geometry를 계산합니다. 너비가 같은 frame-origin 변경만으로 layout geometry mutation을 만들지 않습니다. 반대로 lane count나 lane extent가 실제로 바뀌면 dense Grid 또는 Masonry의 전체 placement가 영향을 받을 수 있으므로 그 분기에서는 필요한 전체 repair를 허용합니다.

Spatial layout의 application rectangle은 Virtual owner가 보유합니다. Surface가 이동하는 것만으로 rectangle이나 packed spatial index를 다시 만들지 않습니다. `sizeOwnership: 'mounted'`에서는 DOM measurement가 width와 height를 바꿀 수 있지만 StableID를 기준으로 collection reorder나 value update 뒤에도 측정된 크기를 유지합니다.

## 브라우저 frame 작업

`@sectile/dom/virtual`은 명시적인 scrollport와 surface를 연결합니다. Header와 footer는 virtual item이 아니라 frame region으로 등록됩니다. Connection은 frame geometry를 cache하고 scroll, frame invalidation, measurement, mutation을 하나의 scheduled frame으로 합친 뒤 frame correction과 layout anchor correction을 함께 적용하고 다음 plan을 공개합니다.

일반 scroll에서는 cached frame geometry를 사용합니다. Frame rectangle을 다시 읽는 경계는 explicit refresh 또는 geometry invalidation입니다. Item measurement도 전체 논리 collection을 훑지 않고 실제로 변경된 mounted entry를 기준으로 처리합니다. Connection은 passive scroll listener 하나, geometry observer 하나, item observer 하나, 최대 하나의 pending animation frame을 소유하며 disconnect 시 모두 정리합니다.

## Vue projection

High-level Vue 컴포넌트는 하나의 공통 collection host를 사용하고 native 또는 consumer item element를 직접 투영합니다. Placement마다 Sectile component instance를 하나씩 만들지 않습니다. 따라서 render 작업은 실제로 emit된 placement 수에 비례하고, 보유하는 item registration은 mount된 identity 수에 비례합니다.

공통 공개 계약은 `StableID`, `getID`, named frame/item slot, 명시적인 size/lane policy, 그리고 bootstrap·ready·empty 사이에서도 유지되는 scrollport/surface anatomy를 사용합니다.

## 남은 브라우저 한계

논리 layout 크기를 브라우저의 물리 scroll 범위에 맞춰 clamp하지 않습니다. 매우 큰 logical extent는 하나의 물리 scroll element가 표현할 수 있는 범위를 넘을 수 있습니다. 이 경우에는 별도의 logical-to-physical scroll-range mapping이 필요하며, 논리 extent를 줄이거나 정확성 검사를 완화하는 방식은 경계를 숨길 뿐 해결하지 못합니다.

Timing certification은 이런 결정적인 복잡도·자원 계약과 별도로 관리합니다. Release나 특정 성능 의사결정에서 실제 지연 시간이 필요할 때 같은 환경의 timing evidence를 사용합니다.
