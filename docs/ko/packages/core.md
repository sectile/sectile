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
- 목록 상자, 콤보박스, 슬라이더, 계층 격자 같은 컴포넌트 규칙

날짜 계산과 날짜 선택기 달력은 [`@sectile/temporal`](/ko/packages/temporal), 화면 영역과 동적 크기 측정은 [`@sectile/virtual`](/ko/packages/virtual)이 맡습니다.

## 읽는 순서

1. [기본 계약](core/foundations.md): ID, `Result`, 변경 차수, 자원 한도.
2. [구조와 상태](core/structures.md): 순서, 범위, 격자, 계층, 선택 상태.
3. [상태 전이와 조합](core/transitions.md): 사건, 불변 갱신, 명령, 외부 상태 관리.

Core에서 상호작용 계약을 정한 뒤 DOM, 터미널, Vue 연결 패키지가 실제 입력과 화면 출력을 이어 줍니다. 날짜 계산은 Temporal이, 큰 화면 영역의 배치와 측정은 Virtual이 맡습니다.
