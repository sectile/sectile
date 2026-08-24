<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 인증 번호 입력

여러 한 글자 입력 칸을 연결해 짧은 인증 번호를 입력합니다.

## 예시

### 인증 번호 번호

짧은 숫자 인증 번호를 한 칸씩 입력합니다.

<ComponentExample component="pin-input" scenario="verification-code" title="인증 번호 번호" description="짧은 숫자 인증 번호를 한 칸씩 입력합니다." :index="0" />

### 미리 입력된 값

완성된 값에서 시작하고 각 입력 칸을 따로 바꿀 수 있습니다.

<ComponentExample component="pin-input" scenario="prefilled" title="미리 입력된 값" description="완성된 값에서 시작하고 각 입력 칸을 따로 바꿀 수 있습니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/pin-input`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PinInputRoot</code></li>
  <li><code class="component-api-token">PinInputInput</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">PinInputRootProps</code></li>
  <li><code class="component-api-token">PinInputRootSlotProps</code></li>
  <li><code class="component-api-token">PinInputInputProps</code></li>
  <li><code class="component-api-token">PinInputInputSlotProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="pin-input"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">input</code></td>
  <td><code>[data-part="input"]</code></td>
  <td>편집 값이나 초안을 입력받습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow Left</kbd> / <kbd>Arrow Right</kbd> | 숫자 입력란 사이를 이동합니다. |
| <kbd>Backspace</kbd> / <kbd>Delete</kbd> | 숫자를 지우고 기대되는 커서 이동을 유지합니다. |
| <kbd>Text input</kbd> | 올바른 문자를 받고 입력이 끝나면 다음 칸으로 이동합니다. |

## 접근성

각 숫자 입력에 독립적인 이름을 제공하고 예측 가능한 포커스 순서를 유지합니다.
