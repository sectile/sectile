# 터미널

`@sectile/terminal`은 터미널 키 입력과 유니코드 문자의 화면 폭을 다른 실행 환경과 같은 컴포넌트 규칙으로 연결합니다.

```sh
pnpm add @sectile/terminal
```

```ts
import * as checkbox from '@sectile/terminal/checkbox'
```

터미널 연결 함수는 입력과 화면 반영을 맡으며 응용 프로그램의 스타일이나 저장 방식을 정하지 않습니다.

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

## 키보드 사용 원칙

화살표 키의 의미는 터미널 화면에 보이는 배치와 일치합니다. 세로 목록은 <kbd>↑</kbd>/<kbd>↓</kbd>, 가로 목록은 <kbd>←</kbd>/<kbd>→</kbd>로 이동합니다. 세로 계층에서는 <kbd>→</kbd>로 하위 단계에 들어가고 <kbd>←</kbd> 또는 <kbd>Esc</kbd>로 돌아옵니다. <kbd>Home</kbd>/<kbd>End</kbd>가 없는 키보드에서는 <kbd>Fn</kbd>+<kbd>←</kbd>/<kbd>→</kbd> 또는 <kbd>Ctrl</kbd>+<kbd>A</kbd>/<kbd>E</kbd>로 현재 단계의 처음과 끝으로 이동합니다. <kbd>Fn</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>는 <kbd>Page Up</kbd>/<kbd>Page Down</kbd>으로 처리합니다. <kbd>Enter</kbd> 또는 <kbd>Space</kbd>는 하위 메뉴를 열거나 명령을 실행합니다.

편집, 페이지 이동, 범위 조절에 필요한 추가 키는 각 컴포넌트 문서에서 따로 안내합니다.

## 터미널에서 체험하기

아래 화면은 브라우저에서 터미널 입력과 출력을 재현한 체험 화면이며, 별도의 `sectile` CLI 명령을 제공한다는 뜻은 아닙니다. 상태 전이에는 실제 `@sectile/terminal` 체크박스 연결 함수를 사용합니다. 항목을 누르거나 체험 화면에 포커스를 둔 뒤 <kbd>Space</kbd> 또는 <kbd>Enter</kbd>를 누르면 선택 상태가 바뀝니다.

<TerminalCheckboxDemo />

## 브라우저에서 Bash 실행하기

격리된 Debian `/bin/bash`를 시작한 뒤 프롬프트에 직접 명령을 입력할 수 있습니다. 브라우저 호스트 터미널 응용 프로그램이 보는 셸 환경을 보여 주는 VM이며, 컴퓨터의 파일이나 호스트 셸에는 접근하지 않습니다. 처음 시작할 때 런타임과 스트리밍 디스크 블록을 내려받습니다.

<BashTerminal />

## 생성 함수

`create*`는 바로 사용할 수 있는 연결 객체를 반환합니다. 잘못된 설정을 직접 복구해야 할 때만 `tryCreate*`를 사용해 `Result`로 받습니다. `create*` 결과에는 `unwrap`이 필요하지 않습니다.
