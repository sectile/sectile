<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 텍스트 입력

선택 영역과 한글 조합을 유지하면서 유니코드 문자열을 편집합니다.

## 예시

### 한글 조합 입력 일부 선택

한글, 영문, 그림 문자를 함께 편집해도 조합 중인 글자가 끊어지지 않습니다.

<ComponentExample component="text" scenario="ime-mixed" title="한글 조합 입력 일부 선택" description="한글, 영문, 그림 문자를 함께 편집해도 조합 중인 글자가 끊어지지 않습니다." :index="0" />

### 유니코드 선택

사용자가 한 글자로 인식하는 문자를 쪼개지 않고 선택 영역을 이동하고 바꿉니다.

<ComponentExample component="text" scenario="unicode-selection" title="유니코드 선택" description="사용자가 한 글자로 인식하는 문자를 쪼개지 않고 선택 영역을 이동하고 바꿉니다." :index="1" />

### 여러 줄

여러 줄을 편집하면서 선택 영역과 글자 조합 상태를 유지합니다.

<ComponentExample component="text" scenario="multiline" title="여러 줄" description="여러 줄을 편집하면서 선택 영역과 글자 조합 상태를 유지합니다." :index="2" />

## 공개 API

Vue 패키지: `@sectile/vue/text`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TextField</code></li>
</ul>
</div>

<div class="component-api-group">
<strong class="component-api-label">타입</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TextFieldProps</code></li>
</ul>
</div>

## 파트

공통 범위: <code class="component-scope-token">[data-scope="text"]</code>. 컴포넌트 내부로 스타일을 제한할 때 파트 선택자와 함께 사용합니다.

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

이름이 있는 입력 또는 여러 줄 입력이 기본 편집·선택·IME·비활성·읽기 전용 의미를 유지합니다.
