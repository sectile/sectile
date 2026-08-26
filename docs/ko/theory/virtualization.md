---
title: 가상화
description: 동적 크기 collection의 geometry, anchor, host scheduling 계약.
---

# 가상화

Sectile 가상화는 네 책임을 분리합니다.

```text
Sequence ID/순서 ── SequencePatch ──┐
                                    ├─ VirtualLayout ── host command
ExtentIndex geometry ── 측정값 ─────┘

CollectionWindow ── 비동기 데이터 적재만 담당
```

`Sequence`는 ID와 순서의 기준입니다. `ExtentIndex`는 논리 항목마다 `exact`, `estimated`, 또는 fallback이 있는 `unknown` 크기를 저장합니다. `VirtualLayout`은 viewport geometry, 화면에 보이는 범위, overscan render 범위, 측정 generation, 스크롤 보정을 관리합니다. `CollectionWindow`는 generation이 붙은 데이터 적재 상태로 따로 유지합니다. render 범위와 적재된 데이터 범위를 같은 상태로 취급하지 않습니다.

## 동적 크기

항목 크기를 고정할 필요가 없습니다. Host는 추정값이나 fallback으로 시작하고 요청된 범위를 렌더링한 뒤 실제 element를 측정해 정확한 크기를 한 번에 보고합니다. 변경된 extent-index chunk만 path-copy합니다. prefix offset 조회, offset에서 index 찾기, splice, move는 전체 collection을 훑지 않습니다.

측정이나 sequence patch 때문에 첫 화면 항목보다 앞선 geometry가 변하면 VirtualLayout은 기존 anchor의 화면 좌표를 유지하고 `anchor-correction` 사유의 `set-scroll-offset` command를 만듭니다. Host는 애니메이션 없이 적용합니다. 화면 위쪽 콘텐츠가 바뀌어도 viewport가 튀지 않으며, 현재 보이는 항목 자체의 크기 변화는 자연스럽게 반영됩니다.

## Host 처리 순서

1. 스크롤 관측값을 `viewport-changed`로 전달.
2. `renderRange` 또는 `render-range-changed`에 맞춰 렌더링.
3. layout을 한 번 읽고 현재 generation으로 `measurements-reported` 한 묶음 전달.
4. 다음 paint 전에 `set-scroll-offset` 적용.
5. 오래된 측정 generation은 폐기.

DOM 읽기와 쓰기는 Core 밖에 둡니다. Host는 observer 결과를 모으고 항목별 읽기·쓰기를 번갈아 하지 않으며, 스크롤 관측을 frame scheduler에서 합칩니다.

## Domain 변경

ID owner와 VirtualLayout에 같은 `SequencePatch`를 적용합니다. splice는 새 ID마다 초기 extent 하나를 같이 전달합니다. move는 기존 extent subtree를 재사용하며 source를 제거한 뒤의 destination index를 씁니다. Reorder command도 완성된 배열 대신 이 patch를 직접 내보냅니다.

render 범위가 적재 범위를 벗어날 때만 `collectionWindowEventForVirtualLayout()`을 사용합니다. 이 함수는 일반 `CollectionWindowEvent`를 만들 뿐이며 request generation과 오래된 응답 거부는 계속 CollectionWindow가 담당합니다.
