<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 도움말

도움말는 열림 상태와 포커스 이동, 닫힘 동작을 다룹니다.

## 기본 사용법

포커스 마우스 올림 설정에서 도움말의 실제 동작을 확인할 수 있습니다.

<ComponentExample component="tooltip" scenario="focus-hover" title="도움말" description="포커스 마우스 올림 설정에서 도움말의 실제 동작을 확인할 수 있습니다." :index="0" />

## 지원 기능

- 열림 상태 상태
- 포커스 또는 마우스 올림 화면 표현
- 설명 연결
- Esc 키 닫기
- 부모가 관리하는 열림 상태

실행 환경마다 입력 방식과 화면 출력은 달라도, 같은 입력에는 같은 상태 변화가 일어납니다.



## 추가 예시

### 처음부터 열림 상태

도움말가 처음부터 열려 있어도 주변 배치를 밀어내지 않습니다.

<ComponentExample component="tooltip" scenario="initially-open" title="처음부터 열림 상태" description="도움말가 처음부터 열려 있어도 주변 배치를 밀어내지 않습니다." :index="1" />
### 외부 상태 관리

현재 값은 부모가 관리하며, 허용된 변경을 다시 도움말에 전달합니다.

<ComponentExample component="tooltip" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하며, 허용된 변경을 다시 도움말에 전달합니다." :index="2" />
### 닫힌 상태

도움말는 닫힌 상태에서 시작하며 실행 요소를 눌렀을 때만 열립니다.

<ComponentExample component="tooltip" scenario="closed" title="닫힌 상태" description="도움말는 닫힌 상태에서 시작하며 실행 요소를 눌렀을 때만 열립니다." :index="3" />
### 열림 상태

도움말가 열린 상태에서 시작해 포커스 이동과 닫힘 동작을 바로 확인할 수 있습니다.

<ComponentExample component="tooltip" scenario="open" title="열림 상태" description="도움말가 열린 상태에서 시작해 포커스 이동과 닫힘 동작을 바로 확인할 수 있습니다." :index="4" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="tooltip" />

## 상태 관리 방식

컴포넌트가 상태를 직접 관리하게 하려면 초깃값을 전달합니다. 저장, 검증, 여러 컴포넌트 사이의 연동이 필요하면 현재 값과 변경 알림을 부모에서 관리합니다.

## 비활성 상태와 읽기 전용 상태

비활성 상태에서는 사용자 입력과 포커스를 받지 않습니다. 읽기 전용 상태에서는 현재 값을 확인하고 포커스를 옮길 수 있지만 값을 바꿀 수 없습니다. 지원 여부는 각 컴포넌트의 성격에 따라 달라집니다.

## 패키지 지원

| 패키지 | 가져오기 경로 | 상태 |
| --- | --- | --- |
| 코어 | `@sectile/core/tooltip` | 배포됨 |
| 브라우저 | `@sectile/dom/tooltip` | 배포됨 |
| 터미널 | `@sectile/terminal/tooltip` | 배포됨 |
| Vue | `@sectile/vue/tooltip` | 개발 중 |

## 의미 규칙

이 컴포넌트는 [관련 접근성 지침](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/)을 따릅니다. 패키지에는 시각 스타일이 포함되지 않으며, 상태 속성과 구성 요소를 이용해 원하는 모양을 적용합니다.
