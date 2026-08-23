# 터미널

`@sectile/terminal`은 터미널 키 입력과 유니코드 문자의 화면 폭을 다른 실행 환경과 같은 컴포넌트 규칙으로 연결합니다.

```sh
pnpm add @sectile/terminal
```

```ts
import * as checkbox from '@sectile/terminal/checkbox'
```

터미널 연결 함수는 입력과 화면 반영을 맡으며 응용 프로그램의 스타일이나 저장 방식을 정하지 않습니다.

## 키보드 사용 원칙

화살표 키의 의미는 터미널 화면에 보이는 배치와 일치합니다. 세로 목록은 <kbd>↑</kbd>/<kbd>↓</kbd>, 가로 목록은 <kbd>←</kbd>/<kbd>→</kbd>로 이동합니다. 세로 계층에서는 <kbd>→</kbd>로 하위 단계에 들어가고 <kbd>←</kbd> 또는 <kbd>Esc</kbd>로 돌아옵니다. <kbd>Home</kbd>/<kbd>End</kbd>는 현재 단계의 처음과 끝으로 이동하며, <kbd>Enter</kbd> 또는 <kbd>Space</kbd>는 하위 메뉴를 열거나 명령을 실행합니다.

편집, 페이지 이동, 범위 조절에 필요한 추가 키는 각 컴포넌트 문서에서 따로 안내합니다.

## 터미널에서 체험하기

아래 화면은 브라우저에서 터미널 입력과 출력을 재현한 체험 화면이며, 별도의 `sectile` CLI 명령을 제공한다는 뜻은 아닙니다. 상태 전이에는 실제 `@sectile/terminal` 체크박스 연결 함수를 사용합니다. 항목을 누르거나 체험 화면에 포커스를 둔 뒤 <kbd>Space</kbd> 또는 <kbd>Enter</kbd>를 누르면 선택 상태가 바뀝니다.

<TerminalCheckboxDemo />

컴포넌트 체험이 아니라 셸 전체가 필요하다면 [실제 Bash 실습](/ko/playground/terminal/)을 열면 됩니다. 브라우저 안에서 Debian `/bin/bash`를 실행하며, 존재하지 않는 Sectile CLI를 흉내 내지 않습니다.

## 생성 함수

`create*`는 바로 사용할 수 있는 연결 객체를 반환합니다. 잘못된 설정을 직접 복구해야 할 때만 `tryCreate*`를 사용해 `Result`로 받습니다. `create*` 결과에는 `unwrap`이 필요하지 않습니다.
