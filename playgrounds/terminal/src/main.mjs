import { unwrap } from '@sectile/primitives/result';
import { fitTerminalText } from '@sectile/terminal/layout';
import { createTTYKeyboard } from '@sectile/terminal/node';
import { demos } from './demos.mjs';
import { ansi, effectLabels, eventLabel } from './ui.mjs';

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('Terminal playground requires an interactive TTY.');
  process.exitCode = 1;
} else {
  run();
}

function run() {
  let menuIndex = 0;
  let active = null;
  let logs = [];
  let closed = false;
  const keyboard = unwrap(createTTYKeyboard(process.stdin, handleInput));
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  process.stdout.on('resize', render);
  render();

  function handleInput(input) {
    if (input.ctrlKey && input.key === 'c') {
      close();
      return;
    }
    if (active !== null && input.ctrlKey && input.key === 'b') {
      active.session.disconnect?.();
      active = null;
      logs = [];
      render();
      return;
    }
    if (active !== null && input.ctrlKey && input.key === 'r') {
      activate(menuIndex);
      return;
    }
    if (active !== null) {
      active.session.handle(input);
      return;
    }
    if (input.key === 'up') menuIndex = (menuIndex - 1 + demos.length) % demos.length;
    else if (input.key === 'down') menuIndex = (menuIndex + 1) % demos.length;
    else if (input.key === 'enter') {
      activate(menuIndex);
      return;
    } else if (/^[1-7]$/.test(input.key)) {
      activate(Number(input.key) - 1);
      return;
    } else if (input.key === 'q') {
      close();
      return;
    }
    render();
  }

  function activate(index) {
    active?.session.disconnect?.();
    menuIndex = index;
    logs = [];
    const definition = demos[index];
    if (definition === undefined) return;
    const host = {
      render,
      record: ({ event, result }) => record(eventLabel(event), result),
      recordText: ({ input, result }) => record(input.type, result),
      readOnly: definition.readOnly === true,
      readOnlyCase: definition.readOnlyCase ?? 0,
    };
    active = { definition, session: definition.create(host) };
    render();
  }

  function record(event, result) {
    logs = [{
      revision: result.snapshot.revision,
      event,
      accepted: result.ok,
      effects: effectLabels(result.commands),
    }, ...logs].slice(0, 6);
  }

  function render() {
    if (closed) return;
    const width = Math.max(24, process.stdout.columns ?? 80);
    const height = Math.max(8, process.stdout.rows ?? 24);
    const lines = [
      `${ansi.bold}${ansi.cyan}Sectile terminal playground${ansi.reset}`,
      active === null
        ? `${ansi.dim}↑/↓ choose · enter open · q quit${ansi.reset}`
        : `${ansi.dim}Ctrl+B menu · Ctrl+R reset · Ctrl+C quit${ansi.reset}`,
      '',
    ];

    if (active === null) {
      lines.push(`${ansi.bold}Choose a facade${ansi.reset}`, '');
      const visibleCount = Math.max(1, height - 7);
      const start = Math.max(0, Math.min(demos.length - visibleCount, menuIndex - Math.floor(visibleCount / 2)));
      demos.slice(start, start + visibleCount).forEach((demo, offset) => {
        const index = start + offset;
        const label = `${index + 1}. ${demo.label}`;
        lines.push(index === menuIndex
          ? `${ansi.current}> ${label}${ansi.reset}`
          : `  ${label}`);
        if (index === menuIndex) lines.push(`     ${ansi.dim}${demo.description}${ansi.reset}`);
      });
    } else {
      lines.push(...active.session.lines(width));
      if (logs.length > 0) {
        lines.push('', `${ansi.bold}events / effects${ansi.reset}`);
        for (const entry of logs) {
          lines.push(`r${entry.revision} ${entry.event} ${entry.accepted ? '✓' : '×'}  ${entry.effects.join(', ') || 'no effects'}`);
        }
      }
    }

    const viewport = lines.slice(0, height).map((line) => fitTerminalText(line, width));
    process.stdout.write(`\u001b[2J\u001b[H${viewport.join('\n')}`);
  }

  function close() {
    if (closed) return;
    closed = true;
    active?.session.disconnect?.();
    keyboard.close();
    process.off('SIGINT', close);
    process.off('SIGTERM', close);
    process.stdout.off('resize', render);
    process.stdout.write('\u001b[2J\u001b[H\u001b[0m');
  }
}
