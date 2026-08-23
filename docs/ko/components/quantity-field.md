<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 수량 입력

수량 입력는 입력 중인 값과 확정된 값을 분리해 다룹니다.

## 기본 사용법

길이 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="quantity-field" scenario="length" title="수량 입력" description="길이 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 정확한 값 정확한 소수 값
- 물리량 선택 상태 단위 목록
- 표준 단위 목록
- 미터법 및 야드파운드법 단위 체계
- 복합 단위 단위 계산식
- 정확한 값 선형 또는 오프셋 포함 선형 변환
- 기준 수량 저장
- 한 줄 안에서 단위 입력값
- 표시 단위 선택
- 계산식 계산
- 선택 및 글자 입력 위치
- 부모가 관리하는 수량 단위 및 입력값 상태

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 온도 단위

온도 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="quantity-field" scenario="temperature" title="온도 단위" description="온도 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다." :index="1" />
### 계산식 입력

50-20%를 입력하면 계산 결과인 40으로 확정됩니다.

<ComponentExample component="quantity-field" scenario="calculator" title="계산식 입력" description="50-20%를 입력하면 계산 결과인 40으로 확정됩니다." :index="2" />
### 복합 단위

복합 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="quantity-field" scenario="compound" title="복합 단위" description="복합 단위 설정에서 수량 입력의 실제 동작을 확인할 수 있습니다." :index="3" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 수량 입력에 전달합니다.

<ComponentExample component="quantity-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 수량 입력에 전달합니다." :index="4" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="quantity-field" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/quantity-field` | 배포됨 |
| 브라우저 | `@sectile/dom/quantity-field` | 배포됨 |
| 터미널 | `@sectile/terminal/quantity-field` | 배포됨 |
| Vue | `@sectile/vue/quantity-field` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/state-and-text#text)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
