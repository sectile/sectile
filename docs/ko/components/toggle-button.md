<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 토글 버튼

같은 작업을 다시 실행할 때까지 눌림 상태를 유지합니다.

## 예시

### 서식

같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다.

<ComponentExample component="toggle-button" scenario="formatting" title="서식" description="같은 작업을 다시 누를 때까지 서식 기능의 눌림 상태를 유지합니다." :index="0" />

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

공통 범위: <code class="component-scope-token">[data-scope="toggle-button"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Space</kbd> | 현재 값을 전환합니다. |
| <kbd>Tab</kbd> | 문서의 기본 포커스 순서로 이동합니다. |

## 접근성

버튼이 눌림 상태를 노출하고 비활성 동작과 읽기 전용 동작을 구분합니다.

[관련 WAI-ARIA 패턴](https://www.w3.org/WAI/ARIA/apg/patterns/button/)에서 호스트 접근성 규칙을 확인할 수 있습니다.
