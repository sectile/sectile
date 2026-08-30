import type { ChartRootProps, UseChartOptions, UseChartResult } from '@sectile/vue/chart';
import type { VirtualListKeyResolver } from '@sectile/vue/virtual/list';

declare const options: UseChartOptions<1 | '1'>;
declare const result: UseChartResult<1 | '1'>;
declare const props: ChartRootProps<1 | '1'>;

options.controlled?.cursor satisfies 1 | '1' | null | undefined;
result.controller.dispatch({ type: 'set-cursor', id: 1 });
props.cursor satisfies 1 | '1' | null | undefined;

const stringKey: VirtualListKeyResolver<{ readonly id: number }> = (value) => String(value.id);
void stringKey;

// @ts-expect-error Vue virtual-list keys remain textual.
const numericKey: VirtualListKeyResolver<{ readonly id: number }> = (value) => value.id;
void numericKey;
