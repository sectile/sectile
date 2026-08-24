import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const feedCase = await readFile(new URL('../.vitepress/theme/components/FeedCase.vue', import.meta.url), 'utf8');
const preview = await readFile(new URL('../.vitepress/theme/components/ComponentExamplePreview.vue', import.meta.url), 'utf8');
const specializedCode = await readFile(new URL('../.vitepress/theme/specialized-example-code.ts', import.meta.url), 'utf8');
const exampleStyles = await readFile(new URL('../.vitepress/theme/component-examples.css', import.meta.url), 'utf8');

test('feed examples model a working release activity window', () => {
  assert.match(preview, /case 'feed': return specialized\(FeedCase, \{ scenario: props\.scenario \}\)/u);
  assert.match(feedCase, /Production deployment completed/u);
  assert.match(feedCase, /Release approved/u);
  assert.match(feedCase, /@request-window="loadWindow"/u);
  assert.match(feedCase, /revision\.value \+= 1/u);
  assert.match(feedCase, /pending === 'after'/u);
  assert.match(feedCase, /pending === 'before'/u);
  assert.match(feedCase, /:set-size="activity\.length"/u);
  assert.match(feedCase, /:get-position="getPosition"/u);
  assert.doesNotMatch(feedCase, /build.*review.*release/su);
});

test('feed code samples are Vue-specific and differ by window policy', () => {
  assert.match(specializedCode, /function feedSource\(scenario: string\)/u);
  assert.match(specializedCode, /scenario === 'load-before'/u);
  assert.match(specializedCode, /scenario === 'load-after'/u);
  assert.match(specializedCode, /FeedLoadEarlier/u);
  assert.match(specializedCode, /FeedLoadNewer/u);
  assert.match(specializedCode, /\/api\/releases\/2026\.08\/activity/u);
  assert.match(specializedCode, /if \(component === 'feed'\) return feedSource\(scenario\)/u);
  assert.doesNotMatch(specializedCode, /@sectile\/dom\/feed/u);
});

test('feed presentation uses one cohesive, focus-visible activity surface', () => {
  assert.match(exampleStyles, /\.feed-demo\s*\{[^}]*overflow:\s*hidden;[^}]*border-radius:/su);
  assert.match(exampleStyles, /\.feed-demo__item:focus-visible/u);
  assert.match(exampleStyles, /\.feed-demo__load/u);
  assert.match(exampleStyles, /@media \(prefers-reduced-motion: reduce\)/u);
});
