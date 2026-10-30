# Floating 위치

Sectile은 실행 요소에 연결된 팝업 위치를 실행 중에 계산합니다. 컴포넌트 CSS는 모양과 크기만 담당합니다. `position`, `top`, `right`, `bottom`, `left`, transform 기반 좌표는 필요하지 않습니다.

아래에서 공통 위치 prop을 바꿔 보세요. 팝업에 계산된 `data-side`와 `data-align`이 표시되므로 충돌에 따른 반전도 바로 확인할 수 있습니다.

<FloatingPositionExample />

## 공통 계약

- `side`와 `align`으로 선호하는 위치를 요청합니다.
- `sideOffset`으로 실행 요소와 팝업 사이 간격을 정합니다.
- `collisionBoundary`와 `collisionPadding`으로 충돌 처리에 사용할 영역과 여백을 정합니다.
- `avoidCollisions`는 `flip`과 `shift`의 기본값을 함께 정합니다. 각 옵션을 명시하면 해당 동작에만 우선 적용합니다.
- `arrowPadding`으로 화살표와 콘텐츠 가장자리 사이 여백을 정합니다.
- `strategy`로 `absolute` 또는 `fixed` 방식을 고릅니다.
- `tracking`은 기본 이벤트 추적 또는 필요한 경우 연속 animation-frame 추적을 사용합니다.
- `hideWhenDetached`는 기준 요소가 화면 배치에서 분리되면 콘텐츠를 숨깁니다.
- `position=false`는 위치 엔진을 끄고 일반 애플리케이션 배치에 맡깁니다.

Popover, Tooltip, Select, Combobox, Cascade Select, Menu Button, 날짜 선택기 Root가 같은 계약을 사용합니다. Menu 하위 메뉴는 부모 항목을 기준 요소로 같은 엔진을 사용합니다.

## 기준 요소 아래에 드롭다운 유지하기

`flip`을 `false`, `shift`를 `true`로 설정하면 요청한 방향을 유지하면서 다른 축으로 팝업을 옮길 수 있습니다. `side="bottom"`에서는 세로 간격을 유지하고, 가로 공간이 부족할 때 경계 안쪽으로 이동합니다.

```vue
<script setup lang="ts">
import { PopoverRoot, PopoverTrigger, PopoverContent } from '@sectile/vue/popover';
</script>

<template>
  <PopoverRoot label="계정 작업" side="bottom" align="start" :flip="false" :shift="true">
    <PopoverTrigger>계정</PopoverTrigger>
    <PopoverContent class="account-actions">
      <a href="/account">계정 설정</a>
    </PopoverContent>
  </PopoverRoot>
</template>
```

생략한 옵션은 `avoidCollisions` 값을 따릅니다. `avoidCollisions`의 기본값은 `true`입니다.

| 옵션 | 방향 변경 | 경계 안쪽 이동 |
| --- | --- | --- |
| 모두 생략 | 사용 | 사용 |
| `avoidCollisions: false` | 사용 안 함 | 사용 안 함 |
| `flip: false, shift: true` | 사용 안 함 | 사용 |
| `avoidCollisions: false, flip: true` | 사용 | 사용 안 함 |

## 정렬과 콘텐츠 크기

정렬은 물리적인 가로·세로 축을 따릅니다. 위·아래 배치에서 `start`는 왼쪽 가장자리, `end`는 오른쪽 가장자리를 맞춥니다. 왼쪽·오른쪽 배치에서는 각각 위쪽과 아래쪽 가장자리를 맞춥니다. `center`는 중심을 맞춥니다. RTL에서도 이 기준은 같습니다.

위치를 지정받는 Content 부분에 가용 크기를 적용하면 그 안에 스크롤 영역을 구성할 수 있습니다.

```css
.account-actions {
  max-width: var(--sectile-position-available-width);
  max-height: var(--sectile-position-available-height);
  overflow: auto;
}
```

`shift`는 기준 요소와의 간격을 유지하며 위치를 옮깁니다. 콘텐츠 크기는 바꾸지 않습니다. 방향을 고정하면 사용할 수 있는 높이나 너비가 없을 수도 있습니다. 콘텐츠 크기와 스크롤, 공간이 부족할 때의 화면 구성은 애플리케이션에서 정합니다.
