<!-- scripts/generate-component-pages.mjs에서 생성함. -->
# 텍스트 입력

선택 영역과 한글 조합을 유지하면서 유니코드 문자열을 편집합니다.

## 용법

### 유니코드 선택

사용자가 한 글자로 인식하는 문자를 쪼개지 않고 선택 영역을 이동하고 바꿉니다.

<ComponentExample component="text" scenario="unicode-selection" title="유니코드 선택" description="사용자가 한 글자로 인식하는 문자를 쪼개지 않고 선택 영역을 이동하고 바꿉니다." :index="0" />

### 여러 줄

여러 줄을 편집하면서 선택 영역과 글자 조합 상태를 유지합니다.

<ComponentExample component="text" scenario="multiline" title="여러 줄" description="여러 줄을 편집하면서 선택 영역과 글자 조합 상태를 유지합니다." :index="1" />

### 외부 상태 관리

현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다.

<ComponentExample component="text" scenario="controlled" title="외부 상태 관리" description="현재 값은 부모가 관리하고, 허용된 변경을 컴포넌트에 다시 전달합니다." :index="2" />

## 예시

### 한글 조합 입력 일부 선택

한글, 영문, 그림 문자를 함께 편집해도 조합 중인 글자가 끊어지지 않습니다.

<ComponentExample component="text" scenario="ime-mixed" title="한글 조합 입력 일부 선택" description="한글, 영문, 그림 문자를 함께 편집해도 조합 중인 글자가 끊어지지 않습니다." :index="3" />

## API

Vue 패키지: `@sectile/vue/text`

<div class="component-api-group">
<strong class="component-api-label">컴포넌트</strong>
<ul class="component-api-list">
  <li><code class="component-api-token">TextField</code></li>
</ul>
</div>

### Props

#### `TextFieldProps`

<dl class="component-api-definitions component-api-definitions--props">
<div class="component-api-definition">
<dt><code>autocomplete</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>편집 입력에 전달할 네이티브 자동 완성 힌트입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>defaultValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | number</code></span><span><span class="component-api-definition__label">기본값</span><code>''</code></span></div>
<p>컴포넌트가 값을 관리할 때 사용할 초깃값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>disabled</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>사용자 조작을 막을지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>form</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>컨트롤을 연결할 네이티브 form 요소의 ID입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelModifiers</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>TextFieldModelModifiers</code></span><span><span class="component-api-definition__label">기본값</span><code>{}</code></span></div>
<p>문자열 갱신에 적용할 Vue v-model 수정자입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string | number</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>부모가 상태를 관리할 때 사용할 현재 값입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>multiline</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>텍스트 입력을 textarea로 렌더링할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>name</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>네이티브 폼 제출에 사용할 이름입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>placeholder</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>undefined</code></span></div>
<p>아직 값이 없을 때 표시할 안내 문자열입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>readonly</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>값을 확인할 수 있지만 바꿀 수 없게 할지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>required</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>boolean</code></span><span><span class="component-api-definition__label">기본값</span><code>false</code></span></div>
<p>제출 전에 올바른 값이 반드시 있어야 하는지 여부입니다.</p>
</dd>
</div>
<div class="component-api-definition">
<dt><code>type</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">타입</span><code>string</code></span><span><span class="component-api-definition__label">기본값</span><code>'text'</code></span></div>
<p>컴포넌트가 사용할 선택 또는 동작 방식입니다.</p>
</dd>
</div>
</dl>

### 이벤트

#### `TextField`

<dl class="component-api-definitions component-api-definitions--events">
<div class="component-api-definition">
<dt><code>update:modelValue</code></dt>
<dd>
<div class="component-api-definition__metadata"><span><span class="component-api-definition__label">페이로드</span><code>string | number</code></span></div>
<p>컴포넌트가 외부 제어 값의 변경을 요청할 때 발생합니다.</p>
</dd>
</div>
</dl>

### 기타 타입

#### `TextFieldModelModifiers`

| 이름 | 타입 | 필수 |
| --- | --- | --- |
| `lazy` | `boolean` | — |
| `number` | `boolean` | — |
| `trim` | `boolean` | — |

#### `TextFieldValueChangeHandler`

```ts
type TextFieldValueChangeHandler = (value: string | number) => void
```

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
