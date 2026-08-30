import type { ChartRootProps, UseChartOptions, UseChartResult } from '../.verification-dist/chart.js';
import type { VirtualListKeyResolver } from '../.verification-dist/virtual-list.js';

declare const options: UseChartOptions<1 | '1'>;
declare const result: UseChartResult<1 | '1'>;
declare const props: ChartRootProps<1 | '1'>;

options.cursor?.value satisfies 1 | '1' | null | undefined;
result.controller.dispatch({ type: 'set-cursor', id: 1 });
props.cursor satisfies 1 | '1' | null | undefined;

const stringKey: VirtualListKeyResolver<{ readonly id: number }> = (value) => String(value.id);
void stringKey;

// @ts-expect-error Vue virtual-list keys remain textual.
const numericKey: VirtualListKeyResolver<{ readonly id: number }> = (value) => value.id;
void numericKey;
