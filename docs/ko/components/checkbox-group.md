<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 체크박스 묶음

하나의 묶음에서 서로 독립된 선택지를 원하는 만큼 고릅니다.

## 예시

### 배포 채널 색상 채널 조절

서로 독립된 배포 채널을 하나 이상 선택합니다.

<ComponentExample component="checkbox-group" scenario="release-channels" title="배포 채널 색상 채널 조절" description="서로 독립된 배포 채널을 하나 이상 선택합니다." :index="0" />

### 비활성 항목 선택 항목

사용할 수 없는 선택지는 그대로 보여 주되 나머지 선택지는 계속 조작할 수 있습니다.

<ComponentExample component="checkbox-group" scenario="disabled-choice" title="비활성 항목 선택 항목" description="사용할 수 없는 선택지는 그대로 보여 주되 나머지 선택지는 계속 조작할 수 있습니다." :index="1" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="checkbox-group" />

## 공개 API

Vue 패키지: `@sectile/vue/checkbox-group`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxGroupRoot</code></li>
  <li><code class="component-api-token">CheckboxGroupItem</code></li>
  <li><code class="component-api-token">CheckboxGroupIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">CheckboxGroupRootProps</code></li>
  <li><code class="component-api-token">CheckboxGroupRootSlotProps</code></li>
  <li><code class="component-api-token">CheckboxGroupItemProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="checkbox-group"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">indicator</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 묶음 안팎으로 포커스를 이동합니다. |
| <kbd>Space</kbd> | 포커스된 체크박스 항목을 전환합니다. |

## 접근성

이름이 있는 묶음 안에서 각 항목을 선택·비활성 상태가 있는 독립 체크박스로 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
