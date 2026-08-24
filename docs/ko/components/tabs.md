<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 탭

포커스와 실행 방식을 조정하며 같은 단계의 패널을 전환합니다.

## 예시

### 직접 선택

탭 사이에서 포커스만 옮기고 확정할 때 패널을 바꿉니다.

<ComponentExample component="tabs" scenario="manual" title="직접 선택" description="탭 사이에서 포커스만 옮기고 확정할 때 패널을 바꿉니다." :index="0" />

### 자동 전환

자동으로 다음 항목으로 이동하면서 일시 정지와 직접 이동 기능도 제공합니다.

<ComponentExample component="tabs" scenario="automatic" title="자동 전환" description="자동으로 다음 항목으로 이동하면서 일시 정지와 직접 이동 기능도 제공합니다." :index="1" />

### 세로 방향 비활성 항목

사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다.

<ComponentExample component="tabs" scenario="vertical-disabled" title="세로 방향 비활성 항목" description="사용할 수 없는 항목을 건너뛰면서 작업 사이를 세로로 이동합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="tabs" />

## 공개 API

Vue 패키지: `@sectile/vue/tabs`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TabsRoot</code></li>
  <li><code class="component-api-token">TabsList</code></li>
  <li><code class="component-api-token">TabsTrigger</code></li>
  <li><code class="component-api-token">TabsContent</code></li>
  <li><code class="component-api-token">TabsIndicator</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TabsActivationMode</code></li>
  <li><code class="component-api-token">TabsRootProps</code></li>
  <li><code class="component-api-token">TabsRootSlotProps</code></li>
  <li><code class="component-api-token">TabsListProps</code></li>
  <li><code class="component-api-token">TabsTriggerProps</code></li>
  <li><code class="component-api-token">TabsTriggerSlotProps</code></li>
  <li><code class="component-api-token">TabsContentProps</code></li>
  <li><code class="component-api-token">TabsContentSlotProps</code></li>
  <li><code class="component-api-token">TabsIndicatorProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="tabs"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">list</code></li>
  <li><code class="component-part-token">trigger</code></li>
  <li><code class="component-part-token">indicator</code></li>
  <li><code class="component-part-token">content</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 가로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 세로 탭 목록에서 탭 사이를 이동합니다. |
| <kbd>Home</kbd> / <kbd>End</kbd> | 첫 번째 또는 마지막 탭으로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 직접 실행 모드에서 포커스된 탭을 엽니다. |

## 접근성

탭 목록이 각 탭을 하나의 탭 패널과 연결하고 선택·비활성·방향 상태를 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
