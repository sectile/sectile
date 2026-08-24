# 브라우저

`@sectile/dom`은 Sectile의 상호작용 규칙을 실제 브라우저 요소에 연결합니다. 키보드와 포인터 입력, 포커스, 조합 입력, 폼, ARIA 속성, 요소 수명 주기를 처리하지만 마크업이나 시각 스타일은 정하지 않습니다.

```sh
pnpm add @sectile/dom
```

어떤 컴포넌트에 의존하는지 분명하도록 컴포넌트별 공개 경로에서 가져옵니다.

```ts
import { createCheckbox } from '@sectile/dom/checkbox'
```

## 기존 요소에 연결하기

응용 프로그램에 필요한 마크업을 만든 다음 상호작용할 요소를 DOM 생성 함수에 전달합니다.

```html
<button id="newsletter" type="button">
  제품 소식 받기: <span id="newsletter-state"></span>
</button>
```

```ts
import { createCheckbox } from '@sectile/dom/checkbox'

const element = document.querySelector<HTMLElement>('#newsletter')
const stateLabel = document.querySelector<HTMLElement>('#newsletter-state')

if (element === null || stateLabel === null) {
  throw new Error('체크박스 마크업을 찾을 수 없습니다.')
}

const checkbox = createCheckbox({
  element,
  defaultValue: false,
  onValueChange(value) {
    console.log('newsletter', value)
  },
})

const render = () => {
  stateLabel.textContent = checkbox.state.checked ? '켬' : '끔'
}

const unsubscribe = checkbox.subscribe(render)
render()

window.addEventListener('pagehide', () => {
  unsubscribe()
  checkbox.destroy()
}, { once: true })
```

생성 함수는 필요한 이벤트 리스너를 등록하고 의미 상태를 요소에 즉시 반영합니다. 위 체크박스의 상태가 바뀌면 `role`, `aria-checked`, `data-state`, 비활성 상태, 읽기 전용 상태도 함께 갱신됩니다.

## 연결 객체 규약

모든 직접 `create*` 생성 함수는 같은 수명 주기 API를 가진 연결 객체를 반환합니다.

| 항목 | 역할 |
| --- | --- |
| `state` | 현재 의미 상태를 읽습니다. |
| `send(input)` | 컴포넌트에 정규화된 상호작용 입력을 보냅니다. |
| `update(value)` | 외부에서 소유하는 제어 상태를 동기화합니다. |
| `subscribe(listener)` | 적용된 변경을 구독하고 구독 해제 함수를 받습니다. |
| `destroy()` | DOM 리스너와 연결 객체가 소유한 자원을 해제합니다. |

같은 객체에서 컴포넌트별 메서드도 사용할 수 있습니다. 포커스 이동, 컬렉션 변경, 팝업 배치처럼 더 복잡한 동작이 필요할 때 사용합니다.

## 상태 소유권

연결 객체가 현재 값을 소유해야 하면 `defaultValue`를 전달합니다. 응용 프로그램 상태가 값을 소유하면 `value`와 `onValueChange`를 함께 전달합니다.

```ts
const checkbox = createCheckbox({
  element,
  value: settings.newsletter,
  onValueChange(nextValue) {
    settings.newsletter = nextValue
    checkbox.update(nextValue)
  },
})
```

제어 상태에서는 상호작용이 제안된 값을 알릴 뿐 응용 프로그램 상태를 몰래 바꾸지 않습니다. 소유자가 값을 수락한 뒤 `update`를 호출해 연결 객체를 동기화합니다. 공통 규칙은 [상태 소유권](/ko/guide/state-ownership)에서 확인할 수 있습니다.

## 컨트롤러와 속성 반영

상태와 렌더링의 수명 주기를 따로 관리해야 하면 `create*Controller`를 사용합니다. 컨트롤러에는 요소가 필요하지 않습니다. `get*Attributes`와 함께 사용하면 스냅숏을 원하는 DOM 구조에 반영할 수 있습니다.

```ts
import {
  createCheckboxController,
  getCheckboxAttributes,
} from '@sectile/dom/checkbox'

const result = createCheckboxController({ defaultValue: 'mixed' })
if (!result.ok) throw new TypeError(result.error.message)

const snapshot = result.value.getSnapshot()
const attributes = getCheckboxAttributes(snapshot.state, { required: true })
```

복합 컴포넌트는 전용 이벤트 변환 함수와 효과 반영 함수도 제공합니다. 사용자 정의 렌더러, 이벤트 위임 시스템, 연결 객체가 요소를 직접 소유할 수 없는 실행 환경에서 이 하위 API를 사용합니다.

## 브라우저 기본 동작

HTML이 이미 올바른 의미를 제공하는 영역에서는 브라우저 기본 동작을 유지합니다.

- 텍스트 필드는 기본 편집, 선택 영역, 한글을 포함한 IME 조합 입력을 유지합니다.
- 폼 컨트롤은 지원 범위 안에서 `name`, `value`, `required`, `disabled`, 소속 폼을 반영합니다.
- 포커스된 요소가 처리해야 하는 키보드 동작을 불필요하게 가로채지 않습니다.
- 포커스 효과는 별도의 가상 포커스 모델을 만들지 않고 실제 요소를 대상으로 합니다.

가능하면 해당 컴포넌트에 맞는 HTML 기본 요소를 사용합니다. 제품 구조상 다른 요소가 필요할 때만 비기본 요소를 사용하고 반환된 ARIA와 데이터 속성을 빠짐없이 적용합니다.

## 떠 있는 화면

Popover와 Tooltip 연결 객체는 Floating UI를 사용합니다. 기본 오프셋, 충돌 시 뒤집기와 이동, 사용 가능한 크기, 화살표 배치, 분리된 앵커 숨김, 열린 동안의 자동 갱신을 지원합니다. 경계, 여백, 배치 전략, 관찰자, 미들웨어는 바꿀 수 있으며 관련 공개 경로에서 Floating UI 미들웨어도 다시 내보냅니다.

## 스타일 선택자

DOM 연결 객체는 동작만 제공하고 테마를 포함하지 않습니다. 응용 프로그램 클래스와 반영된 상태 속성으로 스타일을 지정합니다.

```css
#newsletter {
  border: 1px solid var(--control-border);
  border-radius: 0.5rem;
}

#newsletter[data-state='checked'] {
  background: var(--control-accent);
  color: var(--control-on-accent);
}

#newsletter[data-disabled] {
  cursor: not-allowed;
  opacity: 0.5;
}
```

복합 컴포넌트의 속성 도우미는 안정적인 `data-scope`와 `data-part` 경계도 제공합니다. 전체 규칙은 [스타일링](/ko/guide/styling)에서 확인할 수 있습니다.

## 생성 실패 처리

일반적인 설정에서는 `create*`를 사용합니다. 바로 사용할 수 있는 연결 객체를 반환하며 설정이 잘못되면 형식이 정해진 Sectile 오류를 던집니다. 생성 실패를 복구 가능한 `Result`로 다뤄야 할 때는 대응하는 `tryCreate*`를 사용합니다.

```ts
import { createCheckbox, tryCreateCheckbox } from '@sectile/dom/checkbox'

const connection = createCheckbox(options)
const recoverable = tryCreateCheckbox(options)
```

브라우저의 `create*` 결과에는 `unwrap`을 다시 적용하지 않습니다.
