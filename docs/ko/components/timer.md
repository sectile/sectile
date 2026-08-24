<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 타이머

시작·일시 정지·초기화 동작으로 경과 시간이나 남은 시간을 잽니다.

## 예시

### 스톱워치

현재 상태에 맞는 시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다.

<ComponentExample component="timer" scenario="stopwatch" title="스톱워치" description="현재 상태에 맞는 시작, 일시 정지, 계속, 초기화 동작으로 경과 시간을 잽니다." :index="0" />

### 남은 시간

시간을 설정하고 남은 시간과 완료 피드백을 확인합니다.

<ComponentExample component="timer" scenario="countdown" title="남은 시간" description="시간을 설정하고 남은 시간과 완료 피드백을 확인합니다." :index="1" />

### 목표 시간

경과 시간 목표를 설정하고 완료될 때까지 진행 상태를 확인합니다.

<ComponentExample component="timer" scenario="target" title="목표 시간" description="경과 시간 목표를 설정하고 완료될 때까지 진행 상태를 확인합니다." :index="2" />

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

공통 범위: <code class="component-scope-token">[data-scope="timer"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">area</code></td>
  <td><code>[data-part="area"]</code></td>
  <td>2차원 조작 영역을 제공합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">separator</code></td>
  <td><code>[data-part="separator"]</code></td>
  <td>동작을 추가하지 않고 관련 그룹을 구분합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">control</code></td>
  <td><code>[data-part="control"]</code></td>
  <td>주요 조작부를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">action-trigger</code></td>
  <td><code>[data-part="action-trigger"]</code></td>
  <td>타이머 동작을 실행합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 컴포넌트의 기본 작업 컨트롤 사이를 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 포커스된 작업을 실행합니다. |

## 접근성

형식화된 시간 조각을 하나의 값으로 묶고 시작·일시 정지·초기화·재시작을 이름이 있는 작업으로 유지합니다.
