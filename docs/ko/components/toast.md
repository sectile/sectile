<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토스트 알림

현재 작업을 막지 않고 짧은 피드백을 순서대로 알립니다.

## 예시

### 자동 닫힘

잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다.

<ComponentExample component="toast" scenario="automatic" title="자동 닫힘" description="잠시 표시한 알림을 자동으로 닫되 사용자가 바로 닫을 수 있는 버튼도 함께 제공합니다." :index="0" />

### 자동으로 닫히지 않는 알림

사용자가 직접 닫을 때까지 알림을 계속 표시합니다.

<ComponentExample component="toast" scenario="persistent" title="자동으로 닫히지 않는 알림" description="사용자가 직접 닫을 때까지 알림을 계속 표시합니다." :index="1" />

### 개수 제한

기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다.

<ComponentExample component="toast" scenario="limited" title="개수 제한" description="기존 값을 잃지 않으면서 설정한 항목 수나 화면 표시 개수를 지킵니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="toast" />

## 공개 API

Vue 패키지: `@sectile/vue/toast`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToastProvider</code></li>
  <li><code class="component-api-token">ToastViewport</code></li>
  <li><code class="component-api-token">ToastRoot</code></li>
  <li><code class="component-api-token">ToastTitle</code></li>
  <li><code class="component-api-token">ToastDescription</code></li>
  <li><code class="component-api-token">ToastClose</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">ToastProviderProps</code></li>
  <li><code class="component-api-token">ToastProviderSlotProps</code></li>
  <li><code class="component-api-token">ToastPartProps</code></li>
  <li><code class="component-api-token">ToastRootProps</code></li>
  <li><code class="component-api-token">ToastRootSlotProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="toast"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">viewport</code></li>
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">title</code></li>
  <li><code class="component-part-token">description</code></li>
  <li><code class="component-part-token">close</code></li>
</ul>

`provider`는 DOM 요소를 만들지 않는 상태 제공자입니다.

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 컴포넌트의 기본 작업 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 작업을 실행합니다. |

## 접근성

표시 영역이 알림 순서를 유지하고 각 토스트에 제목·설명·닫기 작업의 이름을 제공합니다.
