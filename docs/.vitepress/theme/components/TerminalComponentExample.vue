<script setup>
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import catalog from '../../../data/components.json';
import { demos } from '../terminal-demo-sessions.mjs';
import { toKeyboardInputs } from '../terminal-keyboard-input.mjs';
import { useDocsLocale } from '../locale.ts';

const props = defineProps({
  component: { type: String, required: true },
  scenario: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  index: { type: Number, default: 0 },
});

const { isKorean } = useDocsLocale();
const terminalHost = ref(null);
const definition = computed(() => demos.find((candidate) => candidate.id === props.component));
const initialCase = computed(() => {
  const component = catalog.components.find((candidate) => candidate.id === props.component);
  const index = component?.scenarios.terminal.indexOf(props.scenario) ?? -1;
  return index < 0 ? 0 : index;
});
const accessibleLabel = computed(() => isKorean.value
  ? `${props.title} 터미널 예시`
  : `${props.title} terminal example`);

let terminal;
let fitAddon;
let resizeObserver;
let inputSubscription;
let session;
let disposed = false;
let renderQueued = false;

function createSession() {
  session?.disconnect?.();
  const current = definition.value;
  if (!current) {
    session = undefined;
    queueRender();
    return;
  }

  const host = {
    render: queueRender,
    record: () => {},
    recordText: () => {},
    documentation: true,
    initialCase: initialCase.value,
    readOnly: current.readOnly === true,
    readOnlyCase: current.readOnlyCase ?? 0,
  };
  session = current.create(host);
  queueRender();
}

function queueRender() {
  if (renderQueued || disposed) return;
  renderQueued = true;
  queueMicrotask(() => {
    renderQueued = false;
    renderTerminal();
  });
}

function stripUnsupportedAnsi(value) {
  return String(value).replace(/\u001b\[(?:38;2;\d+;\d+;\d+|39)m/g, '');
}

function renderTerminal() {
  if (!terminal) return;
  const width = Math.max(28, terminal.cols || 72);
  const lines = session
    ? session.lines(width).map(stripUnsupportedAnsi)
    : [
        `\u001b[1m${props.title}\u001b[0m`,
        '',
        isKorean.value
          ? '이 컴포넌트의 터미널 예시는 아직 제공되지 않습니다.'
          : 'A terminal example is not available for this component yet.',
      ];
  const visible = lines.slice(0, Math.max(1, terminal.rows));
  terminal.write('\u001b[?25l\u001b[H');
  visible.forEach((line, index) => {
    terminal.write(`\u001b[2K${line}${index === visible.length - 1 ? '' : '\r\n'}`);
  });
  terminal.write('\u001b[J');
}

function handleTerminalInput(data) {
  if (!session) return;
  for (const input of toKeyboardInputs(data)) session.handle(input);
  queueRender();
}

onMounted(async () => {
  await nextTick();
  if (!terminalHost.value) return;
  terminal = new Terminal({
    cols: 72,
    rows: 16,
    cursorBlink: false,
    cursorStyle: 'bar',
    fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, monospace',
    fontSize: 13,
    lineHeight: 1.35,
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
  resizeObserver = new ResizeObserver(() => {
    fitAddon?.fit();
    queueRender();
  });
  resizeObserver.observe(terminalHost.value);
  createSession();
});

watch(() => [props.component, props.scenario, props.index], createSession);
watch(isKorean, queueRender);

onBeforeUnmount(() => {
  disposed = true;
  session?.disconnect?.();
  resizeObserver?.disconnect();
  inputSubscription?.dispose();
  terminal?.dispose();
});
</script>

<template>
  <div
    :class="[
      'terminal-demo terminal-component-example',
      { 'terminal-component-example--compact': component === 'quantity-field' },
    ]"
    role="region"
    :aria-label="accessibleLabel"
    tabindex="0"
    @pointerdown="terminal?.focus()"
    @focus="terminal?.focus()"
  >
    <div class="terminal-demo__bar" aria-hidden="true">
      <i /><i /><i />
      <span>@sectile/terminal · {{ component }}</span>
    </div>
    <div ref="terminalHost" class="terminal-demo__xterm terminal-component-example__xterm" />
  </div>
</template>
