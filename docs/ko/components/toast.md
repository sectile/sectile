<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토스트 알림

토스트 알림는 여러 알림의 순서, 표시 시간, 닫힘 동작을 다룹니다.

## 기본 사용법

자동 전환 설정에서 토스트 알림의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="toast" scenario="automatic" title="토스트 알림" description="자동 전환 설정에서 토스트 알림의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 대기 중인 알림 대기열
- 알림 종류 화면 읽기 알림
- 자동 닫힘 또는 계속 표시
- 일시 정지 다시 시작
- 표시 제한
- 직접 선택 직접 닫기

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 자동으로 닫히지 않는 알림

사용자가 직접 닫을 때까지 알림을 계속 표시합니다.

<ComponentExample component="toast" scenario="persistent" title="자동으로 닫히지 않는 알림" description="사용자가 직접 닫을 때까지 알림을 계속 표시합니다." :index="1" />
### 개수 제한

화면에 표시할 알림 수를 제한하면서 대기 순서를 유지합니다.

<ComponentExample component="toast" scenario="limited" title="개수 제한" description="화면에 표시할 알림 수를 제한하면서 대기 순서를 유지합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="toast" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/toast` | 배포됨 |
| 브라우저 | `@sectile/dom/toast` | 배포됨 |
| 터미널 | `@sectile/terminal/toast` | 배포됨 |
| Vue | `@sectile/vue/toast` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/composition)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
