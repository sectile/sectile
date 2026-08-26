import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import {
  arrow,
  autoPlacement,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
} from '../dist/popover.js';
import {
  arrow as tooltipArrow,
  autoPlacement as tooltipAutoPlacement,
  flip as tooltipFlip,
  hide as tooltipHide,
  inline as tooltipInline,
  limitShift as tooltipLimitShift,
  offset as tooltipOffset,
  shift as tooltipShift,
  size as tooltipSize,
} from '../dist/tooltip.js';
import { createPopover } from '../dist/popover.js';

test('DOM floating positioning reserves layout synchronously before measuring', () => {
  const window = new Window({ url: 'https://sectile.dev/' });
  const root = window.document.createElement('div');
  const trigger = window.document.createElement('button');
  window.document.body.append(trigger, root);

  const popover = createPopover({ root, trigger, strategy: 'absolute' });

  assert.equal(root.style.position, 'absolute');
  assert.equal(root.style.visibility, 'hidden');
  popover.disconnect();
  window.close();
});

test('DOM popover exposes the Floating UI middleware surface', () => {
  assert.deepEqual([
    offset(8).name,
    flip().name,
    shift({ limiter: limitShift() }).name,
    size().name,
    arrow({ element: {} }).name,
    hide().name,
    inline().name,
    autoPlacement().name,
  ], ['offset', 'flip', 'shift', 'size', 'arrow', 'hide', 'inline', 'autoPlacement']);
});

test('DOM tooltip exposes the same Floating UI middleware surface', () => {
  assert.deepEqual([
    tooltipOffset(8).name,
    tooltipFlip().name,
    tooltipShift({ limiter: tooltipLimitShift() }).name,
    tooltipSize().name,
    tooltipArrow({ element: {} }).name,
    tooltipHide().name,
    tooltipInline().name,
    tooltipAutoPlacement().name,
  ], ['offset', 'flip', 'shift', 'size', 'arrow', 'hide', 'inline', 'autoPlacement']);
});
