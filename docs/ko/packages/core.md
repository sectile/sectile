---
title: 코어
description: 실행 환경과 무관한 상호작용 상태, 상태 전이, 기본 구조와 명령을 설명합니다.
---

# 코어

`@sectile/core`는 **현재 상태와 사용자 입력을 다음 상태와 실행할 명령으로 바꾸는 규칙**을 담습니다. 같은 상태에서 같은 입력을 받으면 어느 실행 환경에서도 같은 결과가 나옵니다.

```sh
pnpm add @sectile/core
```

```ts
import * as listbox from '@sectile/core/listbox'
import * as sequence from '@sectile/core/sequence'
```

## 코어가 맡는 것

- 순서, 범위, 격자, 계층으로 이루어진 기본 구조
- 현재 위치, 선택, 펼침, 텍스트 편집 상태
- 입력 사건에 따른 결정적인 상태 전이와 순서가 있는 명령
- 안정적인 문자열 ID, 변경 차수, 형식이 정해진 실패, 자원 한도
- 한도가 분명한 지오메트리 연산, 기준점 배치, 범용 거리 인덱스
- 목록 상자, 콤보박스, 슬라이더, 계층 격자 같은 컴포넌트 규칙

Core의 지오메트리는 주어진 값만 계산하는 공통 도구입니다. 항목별 크기, viewport 조회, 동적 측정 상태, 배치 전략, 가상화 보정은 [`@sectile/virtual`](/ko/packages/virtual)이 맡습니다. 실제 DOM 요소나 터미널 셀의 크기를 읽는 일은 해당 host adapter의 책임입니다. 날짜 계산과 날짜 선택기 달력은 [`@sectile/temporal`](/ko/packages/temporal)이 맡습니다.

## 읽는 순서

1. [기본 계약](core/foundations.md): ID, `Result`, 변경 차수, 자원 한도.
2. [구조와 상태](core/structures.md): 순서, 범위, 격자, 계층, 선택 상태.
3. [상태 전이와 조합](core/transitions.md): 사건, 불변 갱신, 명령, 외부 상태 관리.

Core에서 상호작용 계약을 정한 뒤 DOM, 터미널, Vue 연결 패키지가 실제 입력과 화면 출력을 이어 줍니다. 날짜 계산은 Temporal이, 큰 collection의 배치 상태와 측정 반영은 Virtual이 맡습니다.
