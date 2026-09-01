# Floating 위치

Sectile은 실행 요소에 연결된 팝업 위치를 실행 중에 계산합니다. 컴포넌트 CSS는 모양과 크기만 담당합니다. `position`, `top`, `right`, `bottom`, `left`, transform 기반 좌표는 필요하지 않습니다.

아래에서 공통 위치 prop을 바꿔 보세요. 팝업에 계산된 `data-side`와 `data-align`이 표시되므로 충돌에 따른 반전도 바로 확인할 수 있습니다.

<FloatingPositionExample />

## 공통 계약

- `side`와 `align`으로 선호하는 위치를 요청합니다.
- `sideOffset`으로 실행 요소와 팝업 사이 간격을 정합니다.
- `collisionBoundary`, `collisionPadding`, `avoidCollisions`로 반전과 화면 안쪽 이동을 제어합니다.
- `arrowPadding`으로 화살표와 콘텐츠 가장자리 사이 여백을 정합니다.
- `strategy`로 `absolute` 또는 `fixed` 방식을 고릅니다.
- `tracking`은 기본 이벤트 추적 또는 필요한 경우 연속 animation-frame 추적을 사용합니다.
- `hideWhenDetached`는 기준 요소가 화면 배치에서 분리되면 콘텐츠를 숨깁니다.
- `position=false`는 위치 엔진을 끄고 일반 애플리케이션 배치에 맡깁니다.

Popover, Tooltip, Select, Combobox, Cascade Select, Menu Button, 날짜 선택기 Root가 같은 계약을 사용합니다. Menu 하위 메뉴는 부모 항목을 기준 요소로 같은 엔진을 사용합니다.
