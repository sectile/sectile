<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 페이지 나누기

페이지 나누기는 큰 범위를 짧은 페이지 목록으로 보여줍니다.

## 기본 사용법

공간이 좁은 화면에서는 꼭 필요한 이동 버튼만 표시합니다.

<ComponentExample component="pagination" scenario="compact" title="페이지 나누기" description="공간이 좁은 화면에서는 꼭 필요한 이동 버튼만 표시합니다." :index="0" />

## 지원 기능

- 전체 페이지 수
- 항목 범위
- 페이지당 항목 수 변경
- 현재 페이지 주변 표시 구간
- 양 끝과 줄임표 표시
- 처음·이전·다음·마지막 페이지 이동
- 부모가 관리하는 페이지

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 긴 범위

모든 페이지 번호를 늘어놓지 않고도 큰 결과 목록을 이동합니다.

<ComponentExample component="pagination" scenario="long-range" title="긴 범위" description="모든 페이지 번호를 늘어놓지 않고도 큰 결과 목록을 이동합니다." :index="1" />
### 페이지당 항목 수

페이지당 항목 수를 바꾸면 유효한 첫 페이지로 안전하게 이동합니다.

<ComponentExample component="pagination" scenario="page-size" title="페이지당 항목 수" description="페이지당 항목 수를 바꾸면 유효한 첫 페이지로 안전하게 이동합니다." :index="2" />
### 페이지 번호만 표시

처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다.

<ComponentExample component="pagination" scenario="pages-only" title="페이지 번호만 표시" description="처음·마지막 이동 버튼 없이 페이지 번호만 표시합니다." :index="3" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 페이지 나누기에 전달합니다.

<ComponentExample component="pagination" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 페이지 나누기에 전달합니다." :index="4" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="pagination" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/pagination` | 배포됨 |
| 브라우저 | `@sectile/dom/pagination` | 배포됨 |
| 터미널 | `@sectile/terminal/pagination` | 배포됨 |
| Vue | `@sectile/vue/pagination` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [Sectile 조합 이론](/ko/theory/composition)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
