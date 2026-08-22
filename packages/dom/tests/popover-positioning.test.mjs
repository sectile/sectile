import assert from 'node:assert/strict';
import test from 'node:test';
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
