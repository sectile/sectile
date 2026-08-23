<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 타이머

타이머는 일정한 간격으로 나뉜 수치 범위를 정확하게 다룹니다.

## 기본 사용법

시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다.

<ComponentExample component="timer" scenario="stopwatch" title="타이머" description="시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다." :index="0" />

## 지원 기능

- 경과 시간 또는 남은 시간 진행 방향
- 정확한 값 경과 시간 시간
- 선택 사항인 목표 시간
- 시작 일시 정지 다시 시작
- 초기화 및 처음부터 다시
- 입력 완료 명령
- 시간 표시 시간 구성 요소
- 진행률 화면 표현

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 남은 시간

정해진 시간부터 거꾸로 세고 완료 시점을 한 번 알립니다.

<ComponentExample component="timer" scenario="countdown" title="남은 시간" description="정해진 시간부터 거꾸로 세고 완료 시점을 한 번 알립니다." :index="1" />
### 목표 시간

정해진 목표 시각까지의 진행 상태를 표시합니다.

<ComponentExample component="timer" scenario="target" title="목표 시간" description="정해진 목표 시각까지의 진행 상태를 표시합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="timer" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/timer` | 배포됨 |
| 브라우저 | `@sectile/dom/timer` | 배포됨 |
| 터미널 | `@sectile/terminal/timer` | 배포됨 |
| Vue | `@sectile/vue/timer` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/structures#range)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
