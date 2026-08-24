<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 숫자 입력

문자열 입력을 검증하거나 계산하면서 정확한 십진수를 유지합니다.

## 예시

### 정확한 값 정확한 소수

0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다.

<ComponentExample component="number-field" scenario="exact-decimal" title="정확한 값 정확한 소수" description="0.1을 이진 부동소수점으로 바꾸지 않고 입력한 십진수 그대로 유지합니다." :index="0" />

### 계산식 입력

50-20%를 입력하면 계산 결과인 40으로 확정됩니다.

<ComponentExample component="number-field" scenario="calculator" title="계산식 입력" description="50-20%를 입력하면 계산 결과인 40으로 확정됩니다." :index="1" />

### 거듭제곱

2^3^2를 입력하면 거듭제곱을 오른쪽부터 계산합니다.

<ComponentExample component="number-field" scenario="exponent" title="거듭제곱" description="2^3^2를 입력하면 거듭제곱을 오른쪽부터 계산합니다." :index="2" />

### 범위 제한

설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다.

<ComponentExample component="number-field" scenario="bounded" title="범위 제한" description="설정한 최솟값과 최댓값을 벗어난 값은 받지 않습니다." :index="3" />

## 공개 API

Vue 패키지: `@sectile/vue/number-field`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">NumberField</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">NumberFieldProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="number-field"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
| <kbd>Standard editing keys</kbd> | 호스트 입력 관례에 따라 텍스트를 편집하고 선택합니다. |
| <kbd>Tab</kbd> | 기본 텍스트 동작을 유지하며 포커스를 이동합니다. |

## 접근성

이름이 있는 입력은 기본 편집 동작을 유지하며 오류·비활성·읽기 전용 상태를 노출합니다.
