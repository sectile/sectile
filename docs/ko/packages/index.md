---
title: 패키지
description: 상호작용의 의미와 실행 환경을 맡는 패키지를 구분합니다.
---

# 패키지

Sectile 패키지는 계산할 값과 실행할 환경에 따라 나뉩니다. Core는 상호작용을 계산하고, Temporal은 날짜와 시각을 다루며, Tabular는 표 형식 데이터 상호작용을, Virtual은 큰 화면의 배치를 구합니다. DOM, Terminal, Vue 패키지는 이 결과를 실제 입력과 출력에 연결합니다.

<PackageBoundaryMap />

## 의미를 계산하는 패키지

| 패키지 | 핵심 판단 | 함께 쓰는 패키지 |
| --- | --- | --- |
| [`@sectile/core`](/ko/packages/core) | 현재 상태와 사건으로 다음 상태와 명령 계산 | DOM · Terminal · Vue |
| [`@sectile/temporal`](/ko/packages/temporal) | 달력 날짜, 하루 안의 시각, 달력 이동과 선택 계산 | Core · DOM · Vue |
| [`@sectile/tabular`](/ko/packages/tabular) | 행·열 ID, 데이터 접근, 선택, 그룹화, grid 상호작용 | Core · DOM · Vue |
| [`@sectile/virtual`](/ko/packages/virtual) | 항목 크기와 화면 영역으로 배치 좌표와 스크롤 보정값 계산 | Core · DOM · Vue |

앱이 판단할 값에 따라 패키지를 고릅니다. 달력은 Core의 상호작용 규칙과 Temporal의 날짜 계산을 함께 씁니다. 가상 목록은 Core의 안정적인 ID와 Virtual의 배치 계산을 조합합니다. 화면 출력은 DOM, Terminal, Vue 패키지가 이어받습니다.

## 실행 환경에 연결하는 패키지

| 패키지 | 연결하는 것 |
| --- | --- |
| [`@sectile/dom`](/ko/packages/dom) | 브라우저 이벤트, 포커스, 속성, 크기 측정, 스크롤 |
| [`@sectile/terminal`](/ko/packages/terminal) | 키 입력, 터미널 명령, 텍스트 출력 |
| [`@sectile/vue`](/ko/packages/vue) | Vue 상태 관리, 반응성, 슬롯, 스타일을 앱에서 정하는 구성 요소 |

각 패키지는 공개된 가져오기 경로로 연결됩니다. 앱도 계산할 상태, 실행 환경에서 처리할 작업, 제품의 시각 스타일을 같은 기준으로 나누면 구조를 오래 유지하기 쉽습니다.
