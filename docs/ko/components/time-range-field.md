<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 시간 범위 입력

간격과 순서 규칙을 지키며 시작·종료 시각을 편집합니다.

## 예시

### 업무 시간

일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다.

<ComponentExample component="time-range-field" scenario="office-hours" title="업무 시간" description="일반 업무 시간 안에서 시작 시각과 종료 시각을 선택합니다." :index="0" />

### 일정 간격

설정한 간격에 맞는 값만 입력하고 조절합니다.

<ComponentExample component="time-range-field" scenario="stepped" title="일정 간격" description="설정한 간격에 맞는 값만 입력하고 조절합니다." :index="1" />

## 공개 API

Vue 패키지: `@sectile/vue/time-range-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimeRangeFieldRoot</code></li>
  <li><code class="component-api-token">TimeRangeFieldStartInput</code></li>
  <li><code class="component-api-token">TimeRangeFieldEndInput</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TimeRangeFieldRootProps</code></li>
  <li><code class="component-api-token">TimeRangeFieldRootSlotProps</code></li>
  <li><code class="component-api-token">TimeRange</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="time-range-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">start-input</code></td>
  <td><code>[data-part="start-input"]</code></td>
  <td>시작 값을 편집합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">end-input</code></td>
  <td><code>[data-part="end-input"]</code></td>
  <td>종료 값을 편집합니다.</td>
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

시작과 종료 입력에 각각 이름을 제공하고 양 끝의 오류가 보이는 하나의 순서 있는 시간 범위로 노출합니다.
