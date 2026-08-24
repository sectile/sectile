<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 스위치

설정 하나를 즉시 전환합니다.

## 예시

### 알림

배포 알림 설정을 한 번의 조작으로 즉시 전환합니다.

<ComponentExample component="switch" scenario="off" title="알림" description="배포 알림 설정을 한 번의 조작으로 즉시 전환합니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/switch`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SwitchRoot</code></li>
  <li><code class="component-api-token">SwitchThumb</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">SwitchRootProps</code></li>
  <li><code class="component-api-token">SwitchSlotProps</code></li>
  <li><code class="component-api-token">SwitchThumbProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="switch"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">thumb</code></td>
  <td><code>[data-part="thumb"]</code></td>
  <td>트랙 위의 값 하나를 조절합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

루트는 스위치 의미를 제공하며 선택·비활성·읽기 전용 상태를 구분합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
