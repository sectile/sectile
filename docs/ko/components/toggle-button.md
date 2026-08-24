<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토글 버튼

같은 작업을 다시 실행할 때까지 눌림 상태를 유지합니다.

## 예시

### 서식

같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다.

<ComponentExample component="toggle-button" scenario="formatting" title="서식" description="같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다." :index="0" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="toggle-button" />

## 공개 API

Vue 패키지: `@sectile/vue/toggle-button`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToggleButton</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToggleButtonProps</code></li>
  <li><code class="component-api-token">ToggleButtonSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="toggle-button"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

버튼이 눌림 상태를 노출하고 비활성 동작과 읽기 전용 동작을 구분합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/button/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
