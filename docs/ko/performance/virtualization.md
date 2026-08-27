---
title: 가상화 벤치마크
description: 주요 가상화 라이브러리의 브라우저 실행 결과와 Sectile 배치 엔진의 내부 계산 비용을 공개합니다.
---

# 가상화 벤치마크

브라우저 비교와 Sectile 내부 계산 측정을 나눠서 실행합니다. 브라우저 비교에는 각 라이브러리의 프레임워크 연결 코드까지 포함됩니다. 내부 측정은 DOM을 제외하고 `@sectile/virtual`의 배치 계산만 잽니다.

## 브라우저 비교 결과

<VirtualBenchmarkReport />

10만 개의 같은 행을 720 × 480px 화면에 표시했습니다. 고정 높이와 예상 높이, 높이 입력을 생략한 조건을 나눠 재고, 삽입·이동·삭제·높이 변경도 목록의 시작·중간·끝에서 각각 실행했습니다.

처음 표시와 스크롤은 라이브러리 순서를 바꿔 가며 다섯 번 반복했습니다. 각 변경은 10회 실행하며, 행 순서와 높이, 전체 스크롤 높이, 기준 행 위치가 한 프레임이라도 어긋나면 시간과 별개로 실패를 기록합니다.

2026년 8월 27일, Chrome 151, Apple Silicon, macOS에서 얻은 결과입니다. 프레임워크와 연결 코드의 처리 시간도 포함되므로 배치 알고리즘만 떼어 낸 수치로 읽으면 안 됩니다.

비교 대상은 [TanStack Virtual](https://www.npmjs.com/package/%40tanstack/react-virtual), [react-window](https://www.npmjs.com/package/react-window), [React Virtuoso](https://www.npmjs.com/package/react-virtuoso), [react-virtualized](https://www.npmjs.com/package/react-virtualized), [Virtua](https://www.npmjs.com/package/virtua), [Vue Virtual Scroller](https://www.npmjs.com/package/vue-virtual-scroller)입니다. 실행 코드와 원본 JSON은 `benchmarks/virtual-ecosystem`에 있습니다.

```sh
pnpm --filter @sectile/benchmark-virtual-ecosystem dev
```

## Sectile 배치 엔진 내부 측정

다음 수치는 DOM과 Vue를 제외하고 Sectile의 크기 색인, 화면 범위 조회, 배치 결과 생성 비용만 잽니다.

```sh
pnpm --filter @sectile/virtual benchmark
```

2026년 8월 27일, Node 24.19.0, Apple Silicon, macOS에서 관찰한 중앙값입니다.

| 작업 | 중앙값 |
| --- | ---: |
| 준비된 텍스트 한 건의 Pretext `layout()` | 0.608 µs |
| 준비된 텍스트 32건의 Pretext 배치 | 4.977 µs |
| 크기 위치 왕복 조회, 10만 항목 | 0.676 µs |
| 크기 위치 왕복 조회, 100만 항목 | 0.870 µs |
| 선형 목록의 화면 범위 계산, 10만 항목 | 1.237 µs |
| 선형 목록의 배치 결과 생성, 10만 항목 | 7.694 µs |
| 선형 목록의 바뀐 크기 32건 반영, 10만 항목 | 2.857 µs |
| Pretext 32건 계산과 Sectile 크기 반영 | 7.730 µs |
| 위 작업에서 Sectile 배치 관리에 더해진 시간 | 2.753 µs |
| 희소 격자 화면 조회, 10만 영역 | 13.841 µs |
| 희소 격자의 바뀐 행 높이 32건 반영 | 5.451 µs |
| 벽돌형 화면 조회, 10만 항목·8열 | 21.873 µs |
| 자유 좌표 화면 조회, 10만 항목 | 39.982 µs |

처음부터 10만 항목의 검색 구조를 만드는 시간도 같은 실행에서 측정했습니다.

| 배치 방식 | 구성 시간 |
| --- | ---: |
| 희소 격자 | 45.742 ms |
| 벽돌형, 8열 | 16.467 ms |
| 자유 좌표 검색 트리 | 73.927 ms |

화면 영역은 항목 전체를 가로질러 계속 이동합니다. 한 좌표를 반복해서 캐시 효과를 키우지 않습니다. 희소 격자는 화면과 겹칠 가능성이 있는 행을 먼저 좁히고, 자유 좌표 방식은 서로 겹치는 사각형 가운데 화면 크기만 한 묶음을 반환합니다.

Pretext는 미리 준비한 텍스트의 줄 배치 계산만 측정합니다. Sectile 수치에는 크기 색인 조회, ID가 포함된 배치 결과 생성, 측정 순번, 기준 항목 계산이 들어갑니다. 두 작업의 범위가 다르므로 비율로 승패를 정하지 않습니다.

두 벤치마크 모두 기기에 따라 절대 시간이 달라집니다. 자동 통과 기준은 두지 않았습니다. 성능 변화를 확인할 때는 같은 컴퓨터와 같은 브라우저에서 커밋 전후를 다시 측정해야 합니다.
