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

공통 범위: <code class="component-scope-token">[data-scope="toast"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
<tr>
  <td><code class="component-part-token">viewport</code></td>
  <td><code>[data-part="viewport"]</code></td>
  <td>현재 보이는 콘텐츠를 배치하고 경계를 정합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">root</code></td>
  <td><code>[data-part="root"]</code></td>
  <td>컴포넌트 경계와 내부 파트를 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">title</code></td>
  <td><code>[data-part="title"]</code></td>
  <td>연결된 콘텐츠의 제목을 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">close</code></td>
  <td><code>[data-part="close"]</code></td>
  <td>현재 화면을 닫거나 해제합니다.</td>
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

표시 영역이 알림 순서를 유지하고 각 토스트에 제목·설명·닫기 작업의 이름을 제공합니다.
