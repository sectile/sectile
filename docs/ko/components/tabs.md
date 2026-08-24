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

공통 범위: <code class="component-scope-token">[data-scope="tabs"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">list</code></td>
  <td><code>[data-part="list"]</code></td>
  <td>컴포넌트 항목을 탐색 순서대로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

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
