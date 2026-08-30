import type { StableID } from '@sectile/core';
import type { UnitID, UnitSystemDefinition } from '@sectile/core/units';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartModel } from '@sectile/chart/model';

const stringID: StableID = 'datum';
const numericID: StableID = 1;
void stringID;
void numericID;

// @ts-expect-error StableID excludes bigint identities.
const bigintID: StableID = 1n;
void bigintID;

const unitID: UnitID = 'meter';
const unitSystem: UnitSystemDefinition = { id: 'metric', preferences: [] };
void unitID;
void unitSystem;

// @ts-expect-error UnitID remains textual.
const numericUnitID: UnitID = 1;
void numericUnitID;

// @ts-expect-error Unit-system identifiers remain textual.
const numericUnitSystem: UnitSystemDefinition = { id: 1, preferences: [] };
void numericUnitSystem;

const mixedModel: ChartModel<1 | '1'> = {
  layers: [{ id: 1, profile: 'point', data: [{ id: '1', x: 0, y: 0 }] }],
};
declare const controller: ChartController<1 | '1'>;
controller.replaceModel(mixedModel);
controller.dispatch({ type: 'set-cursor', id: 1 });
controller.dispatch({ type: 'set-cursor', id: '1' });
