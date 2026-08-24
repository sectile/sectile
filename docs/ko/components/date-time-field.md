<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 날짜·시간 입력

시간대 변환 없이 날짜와 현지 시각을 함께 편집합니다.

## 예시

### 현지 일정 일정 선택

시간대 변환 없이 날짜와 현지 시각을 하나의 일정으로 확정합니다.

<ComponentExample component="date-time-field" scenario="local-schedule" title="현지 일정 일정 선택" description="시간대 변환 없이 날짜와 현지 시각을 하나의 일정으로 확정합니다." :index="0" />

### 넘나드는 자정 넘김

종료 시각이 다음 날로 넘어가는 일정도 올바르게 유지합니다.

<ComponentExample component="date-time-field" scenario="cross-midnight" title="넘나드는 자정 넘김" description="종료 시각이 다음 날로 넘어가는 일정도 올바르게 유지합니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/date-time-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeField</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">DateTimeValue</code></li>
  <li><code class="component-api-token">DateTimeFieldProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="date-time-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

이름이 있는 입력란은 기본 텍스트 입력을 유지하며 날짜와 시간 검증을 하나의 값으로 노출합니다.
