<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 타이머

시작·일시 정지·초기화 동작으로 경과 시간이나 남은 시간을 잽니다.

## 예시

### 스톱워치

시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다.

<ComponentExample component="timer" scenario="stopwatch" title="스톱워치" description="시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다." :index="0" />

### 남은 시간

정해진 시간부터 거꾸로 세고 완료 시점을 한 번 알립니다.

<ComponentExample component="timer" scenario="countdown" title="남은 시간" description="정해진 시간부터 거꾸로 세고 완료 시점을 한 번 알립니다." :index="1" />

### 목표 시간

정해진 목표 시각까지의 진행 상태를 표시합니다.

<ComponentExample component="timer" scenario="target" title="목표 시간" description="정해진 목표 시각까지의 진행 상태를 표시합니다." :index="2" />

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="timer" />

## 공개 API

Vue 패키지: `@sectile/vue/timer`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimerRoot</code></li>
  <li><code class="component-api-token">TimerArea</code></li>
  <li><code class="component-api-token">TimerSeparator</code></li>
  <li><code class="component-api-token">TimerControl</code></li>
  <li><code class="component-api-token">TimerItem</code></li>
  <li><code class="component-api-token">TimerActionTrigger</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimerRootProps</code></li>
  <li><code class="component-api-token">TimerSlotProps</code></li>
  <li><code class="component-api-token">TimerPartProps</code></li>
</ul>
</div>

## 파트

렌더링되는 파트는 기본적으로 `data-scope="timer"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">root</code></li>
  <li><code class="component-part-token">area</code></li>
  <li><code class="component-part-token">item</code></li>
  <li><code class="component-part-token">separator</code></li>
  <li><code class="component-part-token">control</code></li>
  <li><code class="component-part-token">action-trigger</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 컴포넌트의 기본 작업 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 작업을 실행합니다. |

## 접근성

형식화된 시간 조각을 하나의 값으로 묶고 시작·일시 정지·초기화·재시작을 이름이 있는 작업으로 유지합니다.
