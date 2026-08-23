<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 시간 범위 입력

시간 범위 입력는 입력 중인 값과 확정된 값을 분리해 다룹니다.

## 기본 사용법

업무 시간 설정에서 시간 범위 입력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="time-range-field" scenario="office-hours" title="시간 범위 입력" description="업무 시간 설정에서 시간 범위 입력의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 각각 독립된 양 끝값 입력 중인 값
- 시간대에 영향받지 않는 시각 범위
- 입력 미완료 범위 상태
- 글자 입력 위치 날짜·시간 단위 조절
- 같은 날의 시작·종료 순서 검증
- 부모가 관리하는 범위 및 입력값 상태

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 일정 간격

설정한 간격에 맞는 값만 입력하고 조절할 수 있습니다.

<ComponentExample component="time-range-field" scenario="stepped" title="일정 간격" description="설정한 간격에 맞는 값만 입력하고 조절할 수 있습니다." :index="1" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 시간 범위 입력에 전달합니다.

<ComponentExample component="time-range-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 시간 범위 입력에 전달합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="time-range-field" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/time-range-field` | 배포됨 |
| 브라우저 | `@sectile/dom/time-range-field` | 배포됨 |
| 터미널 | `@sectile/terminal/time-range-field` | 배포됨 |
| Vue | `@sectile/vue/time-range-field` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/state-and-text#text)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
