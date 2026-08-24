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

## 구성

각 영역은 스타일을 적용할 수 있는 공개 경계입니다. 영역을 선택하면 실제 화면에서 차지하는 범위와 상태 속성을 확인할 수 있습니다.

<ComponentAnatomy component="text" />

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

렌더링되는 파트는 기본적으로 `data-scope="text"`를 사용합니다. 아래 이름이 각 파트의 `data-part` 값입니다.

<ul class="component-parts">
  <li><code class="component-part-token">input</code></li>
</ul>

## 키보드 동작

| 키 | 동작 |
| --- | --- |
| <kbd>Standard editing keys</kbd> | 호스트 입력 관례에 따라 텍스트를 편집하고 선택합니다. |
| <kbd>Tab</kbd> | 기본 텍스트 동작을 유지하며 포커스를 이동합니다. |

## 접근성

이름이 있는 입력 또는 여러 줄 입력이 기본 편집·선택·IME·비활성·읽기 전용 의미를 유지합니다.
