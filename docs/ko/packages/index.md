---
title: 패키지
description: 상호작용의 의미와 실행 환경을 맡는 패키지를 구분합니다.
---

# 패키지

Sectile 패키지는 계산할 값과 실행할 환경에 따라 나뉩니다. Core는 상호작용을 계산하고, Form은 접근 가능한 필드 구성과 검증·제출을 연결하며, Temporal은 날짜와 시각을 다룹니다. Tabular는 표 형식 데이터 상호작용을, Virtual은 큰 화면의 배치를, Chart는 차트 데이터·투영·상호작용을 계산합니다. DOM, Terminal, Vue 패키지는 이 결과를 실제 입력과 출력에 연결하며 Form과 Chart는 DOM과 Vue에서 사용할 수 있습니다.

<PackageBoundaryMap />

## 의미를 계산하는 패키지

| 패키지 | 핵심 판단 | 함께 쓰는 패키지 |
| --- | --- | --- |
| [`@sectile/core`](/ko/packages/core) | 상태 전이, ID, 명령, 한도가 분명한 지오메트리 연산 | DOM · Terminal · Vue |
| [`@sectile/form`](/ko/packages/form) | 접근 가능한 필드 구성, 오류, 검증, 제출, 초기화 | DOM · Vue |
| [`@sectile/temporal`](/ko/packages/temporal) | 달력 날짜, 하루 안의 시각, 달력 이동과 선택 계산 | Core · DOM · Vue |
| [`@sectile/tabular`](/ko/packages/tabular) | 행·열 ID, 데이터 접근, 선택, 그룹화, grid 상호작용 | Core · DOM · Vue |
| [`@sectile/virtual`](/ko/packages/virtual) | collection 크기·viewport·측정 상태로 배치와 가상화 보정 계산 | Core · DOM · Vue |
| [`@sectile/chart`](/ko/packages/chart) | immutable 차트 데이터, scale, packed geometry, query와 상호작용 계산 | Core · DOM · Vue |

앱이 판단할 값에 따라 패키지를 고릅니다. 달력은 Core의 상호작용 규칙과 Temporal의 날짜 계산을 함께 씁니다. 가상 목록은 Core의 안정적인 ID와 Virtual의 배치 계산을 조합하고, 차트는 Core의 ID·revision 계약과 Chart의 투영을 조합합니다. 화면 출력은 DOM, Terminal, Vue 패키지가 이어받습니다.

## 실행 환경에 연결하는 패키지

| 패키지 | 연결하는 것 |
| --- | --- |
| [`@sectile/dom`](/ko/packages/dom) | 브라우저 이벤트, 포커스, 속성, 크기 측정, 스크롤 |
| [`@sectile/terminal`](/ko/packages/terminal) | 키 입력, 터미널 명령, 텍스트 출력 |
| [`@sectile/vue`](/ko/packages/vue) | Vue 상태 관리, 반응성, 슬롯, 스타일을 앱에서 정하는 구성 요소 |

각 패키지는 공개된 가져오기 경로로 연결됩니다. 앱도 계산할 상태, 실행 환경에서 처리할 작업, 제품의 시각 스타일을 같은 기준으로 나누면 구조를 오래 유지하기 쉽습니다.

지오메트리도 이 경계를 따릅니다. Core는 주어진 값을 대상으로 한 지오메트리 연산, 기준점 배치, 범용 거리 인덱스를 제공합니다. Virtual은 collection의 크기와 viewport 상태로 배치를 만들고 측정 결과를 반영합니다. 실제 DOM 요소나 터미널 셀의 크기는 해당 실행 환경 패키지가 읽습니다.
