import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import catalog from '../data/components.json' with { type: 'json' };

function section(source, heading) {
  const start = source.indexOf(`### ${heading}`);
  if (start < 0) return '';
  const next = source.indexOf('\n### ', start + 4);
  return source.slice(start, next < 0 ? source.length : next);
}

test('generated Props, Slots, and Events use explanatory tables', async () => {
  for (const component of catalog.components) {
    for (const locale of ['', 'ko/']) {
      const source = await readFile(new URL(`../${locale}components/${component.id}.md`, import.meta.url), 'utf8');
      const props = section(source, 'Props');
      const slots = section(source, locale === 'ko/' ? '슬롯' : 'Slots');
      const events = section(source, locale === 'ko/' ? '이벤트' : 'Events');

      if (props !== '') {
        assert.match(props, locale === 'ko/'
          ? /\| 속성 \| 타입 \| 기본값 \| 설명 \|/u
          : /\| Prop \| Type \| Default \| Description \|/u, `${locale}${component.id}: Props header`);
        assert.doesNotMatch(props, /\| — \| [^|]+ \|$/mu, `${locale}${component.id}: missing default or description`);
      }
      if (slots !== '') {
        assert.match(slots, locale === 'ko/'
          ? /\| 값 \| 타입 \| 설명 \|/u
          : /\| Value \| Type \| Description \|/u, `${locale}${component.id}: Slots header`);
      }
      if (events !== '') {
        assert.match(events, locale === 'ko/'
          ? /\| 이벤트 \| 페이로드 \| 설명 \|/u
          : /\| Event \| Payload \| Description \|/u, `${locale}${component.id}: Events header`);
        assert.doesNotMatch(events, /\(event:|_value|_open|_position/u, `${locale}${component.id}: raw emit signature`);
      }
    }
  }
});

test('Pin Input examples start empty and demonstrate its major options', async () => {
  const page = await readFile(new URL('../components/pin-input.md', import.meta.url), 'utf8');
  const source = await readFile(new URL('../.vitepress/theme/catalog-code.ts', import.meta.url), 'utf8');
  const scenarios = ['verification-code', 'custom-length', 'masked', 'placeholders', 'otp', 'readonly', 'disabled', 'controlled'];

  for (const scenario of scenarios) assert.match(page, new RegExp(`scenario="${scenario}"`, 'u'));
  assert.doesNotMatch(page, /scenario="prefilled"/u);
  assert.doesNotMatch(page, /^## Examples$/mu);
  assert.doesNotMatch(source, /Prefilled access code|default-value="12"|default-value="8472"/u);
  assert.match(source, /'verification-code':[\s\S]*?<PinInputRoot :length="6" label="Verification code">/u);
  assert.match(source, /'custom-length':[\s\S]*?:length="4"/u);
  assert.match(source, /masked:[\s\S]*? mask /u);
  assert.match(source, /placeholders:[\s\S]*?placeholder="○"/u);
  assert.match(source, /otp:[\s\S]*?:otp="true"/u);
  assert.match(source, /readonly:[\s\S]*? readonly /u);
  assert.match(source, /disabled:[\s\S]*? disabled /u);
  assert.match(source, /controlled:[\s\S]*?v-model="value"/u);
});

test('Pin Input documents OTP as an opt-in prop', async () => {
  const page = await readFile(new URL('../components/pin-input.md', import.meta.url), 'utf8');
  const koPage = await readFile(new URL('../ko/components/pin-input.md', import.meta.url), 'utf8');

  assert.match(page, /\| `otp` \| `boolean` \| `false` \|/u);
  assert.match(koPage, /\| `otp` \| `boolean` \| `false` \|/u);
  assert.doesNotMatch(page, /Without OTP/u);
  assert.doesNotMatch(koPage, /OTP 자동 완성 끄기/u);
});
