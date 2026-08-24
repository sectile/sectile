<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# Form

네이티브 컨트롤이 값을 소유한 채 필드 메타데이터, 검증 오류, 제출, 초기화를 조정합니다.

## 예시

### account

네이티브 입력이 값을 소유한 채 계정 설정을 검증하고 제출합니다.

<ComponentExample component="form" scenario="account" title="account" description="네이티브 입력이 값을 소유한 채 계정 설정을 검증하고 제출합니다." :index="0" />

## 공개 API

Vue 패키지: `@sectile/vue/form`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FormRoot</code></li>
  <li><code class="component-api-token">FormField</code></li>
  <li><code class="component-api-token">FormLabel</code></li>
  <li><code class="component-api-token">FormDescription</code></li>
  <li><code class="component-api-token">FormMessage</code></li>
  <li><code class="component-api-token">FormSummary</code></li>
  <li><code class="component-api-token">FormSubmit</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">FormState</code></li>
  <li><code class="component-api-token">FormIssue</code></li>
  <li><code class="component-api-token">FormIssueSource</code></li>
  <li><code class="component-api-token">FormRootProps</code></li>
  <li><code class="component-api-token">FormRootSlotProps</code></li>
  <li><code class="component-api-token">FormFieldProps</code></li>
  <li><code class="component-api-token">FormFieldSlotProps</code></li>
  <li><code class="component-api-token">FormPartProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="form"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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
  <td><code class="component-part-token">field</code></td>
  <td><code>[data-part="field"]</code></td>
  <td>Field 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">label</code></td>
  <td><code>[data-part="label"]</code></td>
  <td>컴포넌트 조작부의 레이블입니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">description</code></td>
  <td><code>[data-part="description"]</code></td>
  <td>연결된 콘텐츠나 결정 내용을 설명합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">message</code></td>
  <td><code>[data-part="message"]</code></td>
  <td>Message 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">summary</code></td>
  <td><code>[data-part="summary"]</code></td>
  <td>Summary 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
<tr>
  <td><code class="component-part-token">submit</code></td>
  <td><code>[data-part="submit"]</code></td>
  <td>Submit 스타일 영역을 노출합니다.</td>
  <td><span aria-label="None">—</span></td>
</tr>
</tbody>
</table>
</div>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> | 네이티브 폼 컨트롤을 문서 순서대로 이동합니다. |
| <kbd>Enter</kbd> | 제출 가능한 네이티브 컨트롤에서 폼을 제출하고 등록된 필드를 검증합니다. |

## 접근성

네이티브 폼과 컨트롤의 의미를 유지하면서 레이블·설명·오류 메시지·오류 요약이 검증 상태를 전달하고 첫 번째 잘못된 컨트롤로 포커스를 옮깁니다.

[관련 WAI-ARIA 패턴](https://html.spec.whatwg.org/multipage/forms.html#forms)에서 호스트 접근성 규칙을 확인할 수 있습니다.
