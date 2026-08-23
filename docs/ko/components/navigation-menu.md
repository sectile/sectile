<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 이동 메뉴

이동 메뉴는 링크의 기본 동작을 유지하면서 여러 화면으로 이동하는 방식을 다룹니다.

## 기본 사용법

제품 이동 메뉴 설정에서 이동 메뉴의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="navigation-menu" scenario="product" title="이동 메뉴" description="제품 이동 메뉴 설정에서 이동 메뉴의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 브라우저 기본 색상 선택기 이동 기본 동작
- 가로 방향 최상위 현재 위치
- 하위 메뉴 패널 경로
- 실행 요소 선택 상태 전환
- Esc 키 닫기
- 화면 경계를 고려한 배치
- 브라우저 기본 색상 선택기 링크 이동

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.

## 터미널 키보드 동작

최상위 이동 메뉴는 가로로, 열린 하위 패널은 세로 계층으로 다룹니다.

| 위치 | 키 | 동작 |
| --- | --- | --- |
| 최상위 | <kbd>←</kbd> / <kbd>→</kbd> | 최상위 링크와 실행 요소 사이를 이동합니다. |
| 최상위 | <kbd>↑</kbd> / <kbd>↓</kbd> | 현재 하위 메뉴를 엽니다. |
| 하위 패널 | <kbd>↑</kbd> / <kbd>↓</kbd> | 패널 안의 항목 사이를 이동합니다. |
| 하위 패널 | <kbd>←</kbd> / <kbd>Esc</kbd> | 패널을 연 최상위 항목으로 돌아갑니다. |
| 모든 단계 | <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 항목을 실행합니다. |

## 추가 예시

### 링크 이동

링크 이동 설정에서 이동 메뉴의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="navigation-menu" scenario="links" title="링크 이동" description="링크 이동 설정에서 이동 메뉴의 실제 동작을 확인할 수 있습니다." :index="1" />
### 비활성 항목

이동 메뉴는 키보드와 포인터 입력을 받지 않습니다.

<ComponentExample component="navigation-menu" scenario="disabled" title="비활성 항목" description="이동 메뉴는 키보드와 포인터 입력을 받지 않습니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="navigation-menu" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/navigation-menu` | 배포됨 |
| 브라우저 | `@sectile/dom/navigation-menu` | 배포됨 |
| 터미널 | `@sectile/terminal/navigation-menu` | 배포됨 |
| Vue | `@sectile/vue/navigation-menu` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [관련 접근성 지침](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
