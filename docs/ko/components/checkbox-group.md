<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 체크박스 묶음

하나의 묶음에서 서로 독립된 선택지를 원하는 만큼 고릅니다.

## 예시

### 배포 채널 색상 채널 조절

서로 독립된 배포 채널을 하나 이상 선택합니다.

<ComponentExample component="checkbox-group" scenario="release-channels" title="배포 채널 색상 채널 조절" description="서로 독립된 배포 채널을 하나 이상 선택합니다." :index="0" />

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

공통 범위: <code class="component-scope-token">[data-scope="checkbox-group"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">item</code></td>
  <td><code>[data-part="item"]</code></td>
  <td>선택하거나 실행할 수 있는 항목 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">indicator</code></td>
  <td><code>[data-part="indicator"]</code></td>
  <td>주요 콘텐츠를 가리지 않고 상태나 위치를 표시합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> | 묶음 안팎으로 포커스를 이동합니다. |
| <kbd>Space</kbd> | 포커스된 체크박스 항목을 전환합니다. |

## 접근성

이름이 있는 묶음 안에서 각 항목을 선택·비활성 상태가 있는 독립 체크박스로 유지합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
