<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 메뉴

메뉴는 계층형 명령 사이를 이동하고 실행하는 방식을 다룹니다.

## 기본 사용법

명령 실행 설정에서 메뉴의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="menu" scenario="commands" title="메뉴" description="명령 실행 설정에서 메뉴의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 계층 현재 위치
- 열림 상태 경로
- 작업 실행
- 포커스 이전 포커스 복원 명령
- 비활성 항목 항목
- 양 끝 이동
- 글자 입력으로 이동

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.

## 터미널 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>↑</kbd> / <kbd>↓</kbd> | 현재 단계의 이전·다음 항목으로 이동합니다. |
| <kbd>→</kbd> | 하위 메뉴를 열고 첫 항목으로 들어갑니다. |
| <kbd>←</kbd> / <kbd>Esc</kbd> | 상위 단계로 돌아가거나 메뉴를 닫습니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 현재 단계의 처음·마지막 항목으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 하위 메뉴를 열거나 현재 명령을 실행합니다. |

## 추가 예시

### 비활성 항목

메뉴는 키보드와 포인터 입력을 받지 않습니다.

<ComponentExample component="menu" scenario="disabled" title="비활성 항목" description="메뉴는 키보드와 포인터 입력을 받지 않습니다." :index="1" />
### 하위 메뉴

하위 메뉴 설정에서 메뉴의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="menu" scenario="nested" title="하위 메뉴" description="하위 메뉴 설정에서 메뉴의 실제 동작을 확인할 수 있습니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="menu" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/menu` | 배포됨 |
| 브라우저 | `@sectile/dom/menu` | 배포됨 |
| 터미널 | `@sectile/terminal/menu` | 배포됨 |
| Vue | `@sectile/vue/menu` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [관련 접근성 지침](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
