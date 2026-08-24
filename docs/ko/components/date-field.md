<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜 입력

시간대와 무관한 날짜를 구조화된 문자열로 입력하고 검증합니다.

## 예시

### ISO 날짜 날짜

시간대와 무관한 날짜를 ISO 형태로 입력합니다.

<ComponentExample component="date-field" scenario="iso-date" title="ISO 날짜 날짜" description="시간대와 무관한 날짜를 ISO 형태로 입력합니다." :index="0" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="date-field" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/date-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateField</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateValue</code></li>
  <li><code class="component-api-token">DateFieldProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="date-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

<div class="component-parts-table">
<table>
<thead>
<tr><th scope="col">파트</th><th scope="col">선택자</th><th scope="col">역할</th><th scope="col">추가 속성</th></tr>
</thead>
<tbody>
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
| <kbd>Arrow Up</kbd> / <kbd>Arrow Down</kbd> | 현재 값 구간을 증가시키거나 감소시킵니다. |
| <kbd>Enter</kbd> | 입력 중인 값을 확정합니다. |
| <kbd>Escape</kbd> | 입력을 취소하고 확정된 값을 복원합니다. |

## 접근성

이름이 있는 입력란은 기본 텍스트 입력을 유지하며 오류·비활성·읽기 전용 상태를 전달합니다.
