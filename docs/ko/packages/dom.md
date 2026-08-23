# 브라우저

`@sectile/dom`은 Sectile의 동작 규칙을 키보드와 포인터 입력, 포커스, 한글 조합 입력, 폼 제출, 접근성 속성, HTML 기본 동작에 연결합니다.

```sh
pnpm add @sectile/dom
```

```ts
import * as checkbox from '@sectile/dom/checkbox'
```

화면 스타일은 포함하지 않으며 속성이나 상태 연결 객체를 제공합니다.

## 생성 함수

일반적인 설정에서는 `create*`를 사용합니다. 바로 사용할 수 있는 연결 객체를 반환하며 설정이 잘못되면 Sectile 오류를 던집니다. 설정 실패를 직접 복구해야 할 때만 `tryCreate*`를 사용해 `Result`로 받습니다.

```ts
const connection = checkbox.createCheckbox(options)
const recoverable = checkbox.tryCreateCheckbox(options)
```

브라우저의 `create*` 결과에는 `unwrap`을 다시 적용하지 않습니다.
