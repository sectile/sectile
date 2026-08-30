import type { StableID } from '@sectile/core';
import type { ChartLayer, ChartModel, ChartPatch } from '../../model.js';

/** Slow, allocation-heavy oracle used only by verification builds. */
export function applyChartPatchReference<ID extends StableID>(
  model: ChartModel<ID>,
  patch: ChartPatch<ID>,
): ChartModel<ID> {
  const layers = model.layers.map((layer) => ({
    ...layer,
    data: [...layer.data],
  }));
  for (const operation of patch.operations) {
    const layer = layers.find((candidate) => candidate.id === operation.layerID);
    if (layer === undefined) throw new Error('Reference patch layer is missing.');
    const data = layer.data as unknown[];
    if (operation.type === 'insert') data.splice(operation.index, 0, ...operation.data);
    else if (operation.type === 'remove') data.splice(operation.index, operation.count);
    else data.splice(operation.index, operation.data.length, ...operation.data);
  }
  return { layers: layers as unknown as readonly ChartLayer<ID>[] };
}
