<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 숫자 입력

숫자 입력는 입력 중인 값과 확정된 값을 분리해 다룹니다.

## 기본 사용법

0.1을 십진수 그대로 입력하고 이진 부동소수점 오차 없이 정확한 값을 유지합니다.

<ComponentExample component="number-field" scenario="exact-decimal" title="숫자 입력" description="0.1을 십진수 그대로 입력하고 이진 부동소수점 오차 없이 정확한 값을 유지합니다." :index="0" />

## 지원 기능

- 정확한 값 정확한 소수 값
- 텍스트 편집 상태
- 선택 및 글자 입력 위치
- 한글 조합 입력 한글 조합 입력
- 계산식 계산
- 계산식 입력 계산기식 백분율
- 정수 거듭제곱
- 입력 확정과 취소
- 부모가 관리하는 값 및 입력값 상태

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 계산식 입력

50-20%를 입력하면 계산 결과인 40으로 확정됩니다.

<ComponentExample component="number-field" scenario="calculator" title="계산식 입력" description="50-20%를 입력하면 계산 결과인 40으로 확정됩니다." :index="1" />
### 거듭제곱

2^3^2를 입력하면 거듭제곱을 오른쪽부터 계산합니다.

<ComponentExample component="number-field" scenario="exponent" title="거듭제곱" description="2^3^2를 입력하면 거듭제곱을 오른쪽부터 계산합니다." :index="2" />
### 범위 제한

표시된 최솟값과 최댓값 안에서만 값을 확정합니다.

<ComponentExample component="number-field" scenario="bounded" title="범위 제한" description="표시된 최솟값과 최댓값 안에서만 값을 확정합니다." :index="3" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 숫자 입력에 전달합니다.

<ComponentExample component="number-field" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 숫자 입력에 전달합니다." :index="4" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="number-field" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/number-field` | 배포됨 |
| 브라우저 | `@sectile/dom/number-field` | 배포됨 |
| 터미널 | `@sectile/terminal/number-field` | 배포됨 |
| Vue | `@sectile/vue/number-field` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/state-and-text#text)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
