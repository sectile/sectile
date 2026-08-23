<script setup lang="ts">
import { Play, RotateCcw, SquareTerminal } from '@lucide/vue';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useDocsLocale } from '../locale.js';

type Status = 'idle' | 'isolating' | 'booting' | 'running' | 'stopped' | 'error';
type CheerpXModule = typeof import('@leaningtech/cheerpx');
type CheerpXLinux = import('@leaningtech/cheerpx').Linux;

const { isKorean } = useDocsLocale();
const terminalHost = ref<HTMLElement | null>(null);
const status = ref<Status>('idle');
const errorMessage = ref('');
const busy = computed(() => status.value === 'isolating' || status.value === 'booting');
const buttonLabel = computed(() => {
  if (status.value === 'isolating') return isKorean.value ? '격리 환경 준비 중' : 'Preparing isolation';
  if (status.value === 'booting') return isKorean.value ? 'Debian 시작 중' : 'Starting Debian';
  if (status.value === 'running') return isKorean.value ? 'Bash 실행 중' : 'Bash is running';
  return isKorean.value ? 'Bash 시작' : 'Start Bash';
});

let terminal: Terminal | undefined;
let fitAddon: FitAddon | undefined;
let resizeObserver: ResizeObserver | undefined;
let terminalInput: { dispose(): void } | undefined;
let linux: CheerpXLinux | undefined;
let sendInput: ((keyCode: number) => void) | undefined;

function writeLine(message = ''): void {
  terminal?.writeln(message.replaceAll('\n', '\r\n'));
}

function renderIdleMessage(): void {
  terminal?.reset();
  writeLine('\x1b[38;2;98;222;201mSectile Bash lab\x1b[0m');
  writeLine('');
  writeLine(isKorean.value
    ? '버튼을 누르면 브라우저 안에서 Debian /bin/bash를 시작합니다.'
    : 'Start an actual Debian /bin/bash session inside this browser.');
  writeLine(isKorean.value
    ? '처음 실행할 때 가상 머신 런타임과 디스크 블록을 내려받습니다.'
    : 'The first run downloads the VM runtime and streamed disk blocks.');
}

async function ensureCrossOriginIsolation(): Promise<boolean> {
  if (window.crossOriginIsolated) return true;
  if (!window.isSecureContext || !('serviceWorker' in navigator)) {
    throw new Error(isKorean.value
      ? '실제 Bash를 실행하려면 HTTPS 또는 localhost와 서비스 워커 지원이 필요합니다.'
      : 'Actual Bash requires HTTPS or localhost and service-worker support.');
  }

  status.value = 'isolating';
  sessionStorage.setItem('sectile-bash-autostart', 'true');
  const workerUrl = new URL('coi-service-worker.js', window.location.href).href;
  await navigator.serviceWorker.register(workerUrl, { scope: './' });
  await navigator.serviceWorker.ready;
  window.location.reload();
  return false;
}

async function startBash(): Promise<void> {
  if (busy.value || status.value === 'running') return;
  errorMessage.value = '';

  try {
    if (!(await ensureCrossOriginIsolation())) return;
    status.value = 'booting';
    terminal?.reset();
    writeLine(isKorean.value ? 'Debian 디스크에 연결하는 중…' : 'Connecting to the Debian disk…');

    const loadModule = new Function('url', 'return import(url)') as (url: string) => Promise<CheerpXModule>;
    const CheerpX = await loadModule('https://cxrtnc.leaningtech.com/1.3.9/cx.esm.js');
    const cloudDevice = await CheerpX.CloudDevice.create('wss://disks.webvm.io/debian_large_20230522_5044875331.ext2');
    const idbDevice = await CheerpX.IDBDevice.create('sectile-docs-bash-overlay');
    const overlayDevice = await CheerpX.OverlayDevice.create(cloudDevice, idbDevice);
    const examplesDevice = await CheerpX.DataDevice.create();
    await examplesDevice.writeFile('/check-environment.sh', [
      '# This file is mounted by the Sectile documentation.',
      'printf "Bash %s\\n" "$BASH_VERSION"',
      'printf "Node "',
      'node --version',
      'printf "\\nThis is a real browser-side Debian shell.\\n"',
      'printf "Sectile component examples use @sectile/terminal directly in the documentation page.\\n"',
    ].join('\n'));

    linux = await CheerpX.Linux.create({
      mounts: [
        { type: 'ext2', path: '/', dev: overlayDevice },
        { type: 'dir', path: '/sectile', dev: examplesDevice },
      ],
    });
    sendInput = linux.setCustomConsole((buffer) => terminal?.write(buffer), terminal?.cols ?? 80, terminal?.rows ?? 22);
    terminalInput = terminal?.onData((data) => {
      if (!sendInput) return;
      for (let index = 0; index < data.length; index += 1) sendInput(data.charCodeAt(index));
    });
    terminal?.reset();
    writeLine('\x1b[38;2;98;222;201mActual Debian /bin/bash\x1b[0m');
    writeLine(isKorean.value
      ? '환경 확인: bash /sectile/check-environment.sh'
      : 'Environment check: bash /sectile/check-environment.sh');
    writeLine('');
    status.value = 'running';
    terminal?.focus();

    const result = await linux.run('/bin/bash', ['--login'], {
      env: [
        'HOME=/home/user',
        'USER=user',
        'SHELL=/bin/bash',
        'EDITOR=vim',
        'TERM=xterm-256color',
        'LANG=C.UTF-8',
        'LC_ALL=C',
      ],
      cwd: '/home/user',
      uid: 1000,
      gid: 1000,
    });
    status.value = 'stopped';
    writeLine('');
    writeLine(`${isKorean.value ? 'Bash 종료 코드' : 'Bash exited with status'}: ${result.status}`);
  } catch (error) {
    status.value = 'error';
    errorMessage.value = error instanceof Error ? error.message : String(error);
    writeLine('');
    writeLine(`\x1b[38;2;242;109;109m${errorMessage.value}\x1b[0m`);
  }
}

function resetEnvironment(): void {
  sessionStorage.removeItem('sectile-bash-autostart');
  terminalInput?.dispose();
  terminalInput = undefined;
  sendInput = undefined;
  linux?.delete();
  linux = undefined;
  status.value = 'idle';
  errorMessage.value = '';
  renderIdleMessage();
}

onMounted(async () => {
  await nextTick();
  if (!terminalHost.value) return;
  terminal = new Terminal({
    cols: 90,
    rows: 22,
    cursorBlink: true,
    fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, monospace',
    fontSize: 13,
    lineHeight: 1.35,
    screenReaderMode: true,
    theme: {
      background: '#080d16',
      cursor: '#6f82ff',
      foreground: '#d9e3f7',
      selectionBackground: '#2f4175',
    },
  });
  fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(terminalHost.value);
  fitAddon.fit();
  resizeObserver = new ResizeObserver(() => fitAddon?.fit());
  resizeObserver.observe(terminalHost.value);
  renderIdleMessage();

  if (sessionStorage.getItem('sectile-bash-autostart') === 'true') {
    sessionStorage.removeItem('sectile-bash-autostart');
    await startBash();
  }
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  terminalInput?.dispose();
  linux?.delete();
  terminal?.dispose();
});
</script>

<template>
  <section class="bash-playground" :aria-label="isKorean ? '실제 Bash 실습' : 'Actual Bash playground'">
    <header class="bash-playground__header">
      <div>
        <SquareTerminal :size="20" aria-hidden="true" />
        <div>
          <strong>{{ isKorean ? '브라우저 속 Debian' : 'Debian in your browser' }}</strong>
          <span>{{ isKorean ? 'CheerpX로 실행하는 실제 /bin/bash' : 'Actual /bin/bash powered by CheerpX' }}</span>
        </div>
      </div>
      <div class="bash-playground__actions">
        <button v-if="status === 'running' || status === 'stopped' || status === 'error'" type="button" @click="resetEnvironment">
          <RotateCcw :size="15" aria-hidden="true" />
          {{ isKorean ? '화면 초기화' : 'Reset view' }}
        </button>
        <button class="bash-playground__start" type="button" :disabled="busy || status === 'running'" @click="startBash">
          <Play :size="15" aria-hidden="true" />
          {{ buttonLabel }}
        </button>
      </div>
    </header>
    <div ref="terminalHost" class="bash-playground__terminal" @pointerdown="terminal?.focus()" />
    <footer>
      <p v-if="errorMessage" role="alert">{{ errorMessage }}</p>
      <p v-else>
        {{ isKorean
          ? '가상 머신은 브라우저 안에서 실행되며 로컬 파일이나 호스트 셸에 접근하지 않습니다.'
          : 'The VM runs inside the browser and cannot access local files or the host shell.' }}
      </p>
      <a href="https://cheerpx.io/docs" target="_blank" rel="noreferrer">CheerpX</a>
      <a href="https://xtermjs.org/" target="_blank" rel="noreferrer">xterm.js</a>
    </footer>
  </section>
</template>
