import { createSequence } from '@sectile/core/sequence';
import { createRange } from '@sectile/core/range';
import { createMultiThumbSliderState, getMultiThumbSliderThumbBounds } from '@sectile/core/multi-thumb-slider';
const domain = createSequence(['low', 'high'] as const), range = createRange({ origin: '0', step: '1', count: 10 });
const state = createMultiThumbSliderState(domain, range, [2, 8]);
getMultiThumbSliderThumbBounds(domain, range, state, 'low');
// @ts-expect-error Domain identity determines valid thumb identifiers.
getMultiThumbSliderThumbBounds(domain, range, state, 'missing');
