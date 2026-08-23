<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 달력

달력는 여러 항목 사이의 이동, 선택, 화면 표시를 함께 다룹니다.

## 기본 사용법

월간 달력 설정에서 달력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="calendar" scenario="month" title="달력" description="월간 달력 설정에서 달력의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 격자 현재 위치
- 선택
- 페이지 자료 요청
- 사용 가능 여부
- 부모가 관리하는 선택 및 현재 항목

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 비활성 항목 주말 비활성

비활성 항목 주말 비활성 설정에서 달력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="calendar" scenario="disabled-weekends" title="비활성 항목 주말 비활성" description="비활성 항목 주말 비활성 설정에서 달력의 실제 동작을 확인할 수 있습니다." :index="1" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 달력에 전달합니다.

<ComponentExample component="calendar" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 달력에 전달합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="calendar" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/calendar` | 배포됨 |
| 브라우저 | `@sectile/dom/calendar` | 배포됨 |
| 터미널 | `@sectile/terminal/calendar` | 배포됨 |
| Vue | `@sectile/vue/calendar` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/composition)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
