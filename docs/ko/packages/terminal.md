# 터미널

`@sectile/terminal`은 터미널 키 입력과 유니코드 문자의 화면 폭을 다른 실행 환경과 같은 컴포넌트 규칙으로 연결합니다.

```sh
pnpm add @sectile/terminal
```

```ts
import * as checkbox from '@sectile/terminal/checkbox'
```

터미널 연결 함수는 입력과 화면 반영을 맡습니다. 스타일과 저장 방식은 응용 프로그램이 정합니다.

## 제품 범위

이 패키지의 본체는 의미 기반 실행 환경 어댑터입니다. 터미널 입력을 정규화하고 Core 효과를 투영하여 응용 프로그램이나 기존 TUI 렌더러가 DOM과 같은 상호작용 의미를 공유하게 합니다. `screen`, `layout`, `appearance`, `node` 경로는 예시와 작은 응용 프로그램을 위한 소형 참고 렌더러입니다. Reconciliation, 스크롤, 라우팅, 저장, 프로세스 생명주기는 응용 프로그램과 TUI 렌더러가 맡습니다.

큰 응용 프로그램에서는 기존 렌더러가 레이아웃과 입출력을 계속 소유하게 하고, 그 입력을 `TerminalKeyboardInput`으로 바꾼 뒤 컴포넌트 연결 객체를 의미 경계로 사용합니다.

## 화면 전체 구성하기

선택 기능인 화면 계층을 사용하면 레이아웃 트리를 고정 크기의 터미널 화면으로 만들 수 있습니다. 행과 열, 테두리 상자, 안쪽 여백, 간격, 잘라내기, 남은 공간 채우기를 조합해 브라우저 화면처럼 전체 구조를 설계할 수 있습니다. 어떤 구조로 배치할지는 응용 프로그램이 결정합니다.

```ts
import { createTerminalAppearance } from '@sectile/terminal/appearance'
import { createTerminalScreenWriter } from '@sectile/terminal/node'
import {
  renderTerminalScreen,
  terminalBox,
  terminalColumn,
  terminalRow,
  terminalText,
} from '@sectile/terminal/screen'

const appearance = createTerminalAppearance({
  theme: {
    accent: { foreground: 'bright-cyan', bold: true },
    current: { foreground: 'black', background: 'bright-cyan' },
  },
})

const view = terminalBox(
  terminalColumn([
    terminalText('프로젝트 설정', { style: 'accent' }),
    terminalRow([
      terminalText('탐색', { width: 24 }),
      terminalText('편집기', { width: 'fill' }),
    ], { gap: 2, height: 'fill' }),
  ], { gap: 1, width: 'fill', height: 'fill' }),
  { title: 'Sectile', padding: 1, width: 'fill', height: 'fill' },
)

const writer = createTerminalScreenWriter(process.stdout, {
  appearance,
  alternateScreen: true,
})

writer.render(renderTerminalScreen(view, {
  columns: process.stdout.columns,
  rows: process.stdout.rows,
  appearance,
}))
```

반복해서 사용하는 모양은 의미에 따른 테마 역할로 지정하고, 한 곳에서만 쓰는 예외는 스타일 객체로 넘기면 됩니다. 색상은 터미널 기능에 맞춰 트루컬러, 256색, 16색, 무색상 순으로 자동 조정됩니다.

## 캐럿과 화면 커서

편집 중인 글의 논리적 캐럿은 UTF-16 위치로 유지합니다. 이를 텍스트 노드에 연결하면 렌더러가 문자소 묶음, 두 칸 문자, 줄바꿈, 안쪽 여백, 잘라내기를 모두 반영해 실제 터미널 셀 위치를 계산합니다.

```ts
terminalText(input, {
  cursor: {
    codeUnitOffset: selection.focusCodeUnitOffset,
    shape: 'bar',
  },
})
```

Node 화면 출력기는 첫 화면 이후 달라진 행만 다시 씁니다. 계산된 셀로 실제 터미널 커서를 옮기고 모양과 표시 여부를 적용하며, 종료할 때 터미널 상태를 복구합니다. 키를 누를 때마다 화면 전체가 지워지고 다시 그려지는 깜빡임을 피할 수 있습니다.

## TTY 소유권과 정리

`createTTYKeyboard`는 stdin 스트림 하나의 키보드 입력을 독점합니다. 활성 소유자가 있는데 다시 만들면 `tty-input-already-owned` 오류가 납니다. 외부에서 등록한 `keypress` listener는 그대로 두며, `close()`는 Sectile listener만 제거하고 기존 raw mode와 flowing/paused 상태를 복원합니다. 여러 번 닫아도 안전하며 닫은 뒤에는 다른 controller가 같은 스트림을 소유할 수 있습니다.

프로세스 signal은 응용 프로그램이 소유하며 입력과 출력 자원을 모두 닫아야 합니다. 화면 출력기는 렌더링을 시작한 뒤 `close()`가 호출되면 커서 표시와 alternate screen을 정확히 한 번 복원합니다.

```ts
import { createTTYKeyboard, createTerminalScreenWriter } from '@sectile/terminal/node'

const keyboardResult = createTTYKeyboard(process.stdin, handleKeyboardInput)
if (!keyboardResult.ok) throw new Error(keyboardResult.error.message)

const keyboard = keyboardResult.value
const writer = createTerminalScreenWriter(process.stdout, { alternateScreen: true })
let closed = false

function close(): void {
  if (closed) return
  closed = true
  keyboard.close()
  writer.close()
}

process.once('SIGINT', () => { close(); process.exitCode = 130 })
process.once('SIGTERM', () => { close(); process.exitCode = 143 })
process.once('exit', close)
process.stdout.on('resize', render)
```

프로세스를 유지한 채 터미널 화면만 내리는 구성에서는 응용 프로그램이 등록한 signal과 resize listener도 같은 생명주기에서 제거합니다.

## 키보드 사용 원칙

화살표 키의 의미는 터미널 화면에 보이는 배치와 일치합니다. 세로 목록은 <kbd>↑</kbd>/<kbd>↓</kbd>, 가로 목록은 <kbd>←</kbd>/<kbd>→</kbd>로 이동합니다. 세로 계층에서는 <kbd>→</kbd>로 하위 단계에 들어가고 <kbd>←</kbd> 또는 <kbd>Esc</kbd>로 돌아옵니다. 현재 단계의 처음과 끝은 <kbd>Home</kbd>/<kbd>End</kbd>, <kbd>Fn</kbd>+<kbd>←</kbd>/<kbd>→</kbd>, <kbd>Ctrl</kbd>+<kbd>A</kbd>/<kbd>E</kbd>로 이동합니다. <kbd>Fn</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>는 <kbd>Page Up</kbd>/<kbd>Page Down</kbd>으로 처리합니다. <kbd>Enter</kbd> 또는 <kbd>Space</kbd>는 하위 메뉴를 열거나 명령을 실행합니다.

`@sectile/terminal/reorder`는 `move-up`, `move-down`, `move-start`, `move-end`, `indent`, `outdent`를 sequence/tree 이동 명령으로 제공합니다. `@sectile/terminal/layer-stack`은 애플리케이션이 소유하는 레이어 범위를 만들어 여러 터미널 팝업의 최상위 닫기와 하위 레이어 닫기 순서를 통일합니다.

편집, 페이지 이동, 범위 조절에 필요한 추가 키는 각 컴포넌트 문서에서 따로 안내합니다.

## 터미널에서 체험하기

아래 화면은 브라우저에서 터미널 입력과 출력을 재현합니다. 상태 전이에는 실제 `@sectile/terminal` 체크박스 연결 함수를 사용합니다. 항목을 누르거나 체험 화면에 포커스를 둔 뒤 <kbd>Space</kbd> 또는 <kbd>Enter</kbd>를 누르면 선택 상태가 바뀝니다.

<TerminalCheckboxDemo />

## 브라우저에서 Bash 실행하기

격리된 Debian `/bin/bash`를 시작한 뒤 프롬프트에 직접 명령을 입력할 수 있습니다. 브라우저 호스트 터미널 응용 프로그램이 보는 셸 환경을 보여 주는 VM이며, 파일 접근 범위는 VM의 가상 디스크와 셸로 제한됩니다. 처음 시작할 때 런타임과 스트리밍 디스크 블록을 내려받습니다.

<BashTerminal />

## 생성 함수

`create*`는 바로 사용할 수 있는 연결 객체를 반환합니다. 설정 오류를 직접 복구하는 흐름에서는 `tryCreate*`로 `Result`를 받습니다.
