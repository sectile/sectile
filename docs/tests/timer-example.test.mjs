import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { specializedVueCodeFor } from '../.vitepress/theme/specialized-example-code.ts';

const timerCase = await readFile(
  new URL('../.vitepress/theme/components/TimerCase.vue', import.meta.url),
  'utf8',
);
const preview = await readFile(
  new URL('../.vitepress/theme/components/ComponentExamplePreview.vue', import.meta.url),
  'utf8',
);
const styles = await readFile(
  new URL('../.vitepress/theme/component-examples.css', import.meta.url),
  'utf8',
);

test('timer demos expose distinct state-aware controls instead of three inert button rows', () => {
  assert.match(timerCase, /v-slot="\{ running, completed: timerCompleted, progress, valueMs: liveValueMs \}"/);
  assert.match(timerCase, /v-else-if="running"[\s\S]*?action="pause"/);
  assert.match(timerCase, /v-else-if="isPristine\(liveValueMs\)"[\s\S]*?action="start"/);
  assert.match(timerCase, /v-else[\s\S]*?key="resume"[\s\S]*?action="resume"/);
  assert.match(timerCase, /v-if="timerCompleted"[\s\S]*?action="restart"/);
  assert.match(timerCase, /v-if="!isPristine\(liveValueMs\) \|\| timerCompleted"[\s\S]*?action="reset"/);
  assert.doesNotMatch(preview, /autoStart: props\.scenario === 'countdown'/);
});

test('countdown and target durations are editable and report progress and completion', () => {
  assert.match(timerCase, /v-model\.number="draftMinutes"/);
  assert.match(timerCase, /v-model\.number="draftSeconds"/);
  assert.match(timerCase, /Apply &amp; start/);
  assert.match(timerCase, /class="timer-progress"/);
  assert.match(timerCase, /role="status"/);
  assert.match(timerCase, /Focus session finished/);
  assert.match(timerCase, /Target of \$\{formatDuration\(activeDurationMs\)\} reached/);
  assert.match(styles, /\.timer-progress > span\s*\{[^}]*background:\s*var\(--demo-brand\)/s);
  assert.match(styles, /\.timer-status\[data-state="complete"\]/);
});

test('timer Code examples are scenario-specific and show the corresponding product flow', () => {
  const stopwatch = specializedVueCodeFor('timer', 'stopwatch');
  const countdown = specializedVueCodeFor('timer', 'countdown');
  const target = specializedVueCodeFor('timer', 'target');

  assert.match(stopwatch, /v-else-if="valueMs > 0" action="resume"/);
  assert.match(countdown, /v-model\.number="seconds"/);
  assert.match(countdown, /Focus session finished/);
  assert.match(target, /v-model\.number="targetSeconds"/);
  assert.match(target, /Target reached/);
  assert.notEqual(stopwatch, countdown);
  assert.notEqual(countdown, target);
});
