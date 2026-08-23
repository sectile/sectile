<script setup lang="ts">
import { createCheckbox } from '@sectile/terminal/checkbox';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useDocsLocale } from '../locale.js';

const props = withDefaults(defineProps<{ mixed?: boolean }>(), { mixed: false });
const { isKorean } = useDocsLocale();
const terminalHost = ref<HTMLElement | null>(null);
const connection = createCheckbox({ defaultValue: props.mixed ? 'mixed' : false });
const checked = ref(connection.state.checked);
const label = computed(() => props.mixed
  ? (isKorean.value ? '배포 채널 선택' : 'Select deployment channels')
  : (isKorean.value ? '분석 기능 포함' : 'Include analytics'));
const hint = computed(() => isKorean.value
  ? 'Space 또는 Enter로 선택 상태를 바꿀 수 있습니다.'
  : 'Press Space or Enter to toggle the value.');

let terminal: Terminal | undefined;
let fitAddon: FitAddon | undefined;
let resizeObserver: ResizeObserver | undefined;
let inputSubscription: { dispose(): void } | undefined;
const unsubscribe = connection.subscribe((snapshot) => {
  checked.value = snapshot.state.checked;
  renderTerminalMark();
});

function getTerminalMark(): string {
  return checked.value === true ? 'x' : checked.value === 'mixed' ? '-' : ' ';
}

function renderTerminalFrame(): void {
  if (!terminal) return;
  terminal.write('\x1b[?25l\x1b[H\x1b[2K');
  terminal.write(`\x1b[38;2;98;222;201m›\x1b[0m [${getTerminalMark()}] ${label.value}\r\n`);
  terminal.write('\x1b[2K\r\n\x1b[2K');
  terminal.write(`\x1b[38;2;127;139;161m${hint.value}\x1b[0m`);
  terminal.write('\x1b[?25h');
}

function renderTerminalMark(): void {
  if (!terminal) return;
  terminal.write(`\x1b[s\x1b[1;4H${getTerminalMark()}\x1b[u`);
}

function handleTerminalInput(data: string): void {
  for (const character of data) {
    if (character === ' ') connection.handleKeyboardInput({ key: 'space' });
    if (character === '\r' || character === '\n') connection.handleKeyboardInput({ key: 'enter' });
  }
}

onMounted(async () => {
  await nextTick();
  if (!terminalHost.value) return;

  terminal = new Terminal({
    cols: 52,
    rows: 4,
    cursorBlink: true,
    cursorStyle: 'bar',
    fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, monospace',
    fontSize: 14,
    lineHeight: 1.45,
    screenReaderMode: true,
    scrollback: 0,
    theme: {
      background: '#080d16',
      cursor: '#6f82ff',
      foreground: '#edf2ff',
      selectionBackground: '#2f4175',
    },
  });
  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(terminalHost.value);
  fitAddon.fit();
  inputSubscription = terminal.onData(handleTerminalInput);
  resizeObserver = new ResizeObserver(() => fitAddon?.fit());
  resizeObserver.observe(terminalHost.value);
  renderTerminalFrame();
  terminal.focus();
});

watch([isKorean, label], renderTerminalFrame);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  inputSubscription?.dispose();
  terminal?.dispose();
  unsubscribe();
  connection.destroy();
});
</script>

<template>
  <div
    class="terminal-demo"
    role="region"
    :aria-label="isKorean ? '터미널 체크박스 체험' : 'Terminal checkbox example'"
    @pointerdown="terminal?.focus()"
  >
    <div class="terminal-demo__bar" aria-hidden="true">
      <i /><i /><i />
      <span>@sectile/terminal · checkbox</span>
    </div>
    <div ref="terminalHost" class="terminal-demo__xterm" />
  </div>
</template>
