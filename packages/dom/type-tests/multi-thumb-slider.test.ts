import { createSequence } from '@sectile/core/sequence';
import { createRange } from '@sectile/core/range';
import { createMultiThumbSliderState } from '@sectile/core/multi-thumb-slider';
import { getMultiThumbSliderThumbAttributes, type MultiThumbSliderConnection } from '@sectile/dom/multi-thumb-slider';
const domain = createSequence(['low', 'high'] as const), range = createRange({ origin: '0', step: '1', count: 10 });
const state = createMultiThumbSliderState(domain, range, [2, 8]);
getMultiThumbSliderThumbAttributes({ domain, range, state, id: 'low', formatValue: (value, id) => value + id });
// @ts-expect-error A thumb must be part of the canonical domain.
getMultiThumbSliderThumbAttributes({ domain, range, state, id: 'missing' });
declare const connection: MultiThumbSliderConnection<'low' | 'high'>;
const connectedDomain: typeof domain = connection.domain; void connectedDomain;
