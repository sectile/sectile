<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Month Picker

한 해의 월 격자에서 달 하나를 고릅니다.

## 예시

### billing 월간 달력

다음 결제 주기에 사용할 달을 고릅니다.

<ComponentExample component="month-picker" scenario="billing-month" title="billing 월간 달력" description="다음 결제 주기에 사용할 달을 고릅니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/month-picker`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthPickerRoot</code></li>
  <li><code class="component-api-token">MonthPickerTrigger</code></li>
  <li><code class="component-api-token">MonthPickerContent</code></li>
  <li><code class="component-api-token">MonthPickerGrid</code></li>
  <li><code class="component-api-token">MonthPickerCell</code></li>
  <li><code class="component-api-token">MonthPickerInput</code></li>
  <li><code class="component-api-token">MonthPickerPreviousYear</code></li>
  <li><code class="component-api-token">MonthPickerNextYear</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">MonthPickerRootProps</code></li>
  <li><code class="component-api-token">MonthPickerValue</code></li>
  <li><code class="component-api-token">MonthPickerCellSlotProps</code></li>
  <li><code class="component-api-token">MonthPickerPartProps</code></li>
  <li><code class="component-api-token">MonthPickerRootSlotProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="month-picker"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
<tr>
  <td><code class="component-part-token">trigger</code></td>
  <td><code>[data-part="trigger"]</code></td>
  <td>연결된 콘텐츠를 열고 닫거나 활성화합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">content</code></td>
  <td><code>[data-part="content"]</code></td>
  <td>현재 상태에 맞는 컴포넌트 콘텐츠를 담습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">grid</code></td>
  <td><code>[data-part="grid"]</code></td>
  <td>셀을 탐색 가능한 2차원 구조로 묶습니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">cell</code></td>
  <td><code>[data-part="cell"]</code></td>
  <td>탐색하거나 선택할 수 있는 그리드 값 하나입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">previous-year</code></td>
  <td><code>[data-part="previous-year"]</code></td>
  <td>이전 년(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">next-year</code></td>
  <td><code>[data-part="next-year"]</code></td>
  <td>다음 년(으)로 이동합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Arrow keys</kbd> | 연도 격자에서 달 사이를 이동합니다. |
| <kbd>Page Up</kbd> / <kbd>Page Down</kbd> | 이전 또는 다음 연도로 이동합니다. |
| <kbd>Enter</kbd> / <kbd>Space</kbd> | 강조된 달을 선택합니다. |
| <kbd>Escape</kbd> | 값을 바꾸지 않고 월 격자를 닫습니다. |

## 접근성

이름이 있는 입력과 실행 요소가 연도 격자를 연결하며 각 칸은 달의 선택·강조·비활성 상태를 노출합니다.
