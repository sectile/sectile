import { tryMeasureJSON, tryParseJSON, trySnapshotJSON, tryStringifyJSON } from '@sectile/core/json';
import type { JSONDataEncoding } from '@sectile/core/json';
import type { JSONTextResult, JSONTextSnapshot } from '@sectile/core/json';
import type { JSONValue, JSONDataLimits, JSONDataResult, JSONDataSnapshot, JSONDataWork } from '@sectile/core/json';

const limits: JSONDataLimits = { maxInputBytes: 4096, maxInputValues: 128, maxInputDepth: 8, maxStringCodeUnits: 1024 };
const data: JSONValue = { items: [null, false, 0, 'text'] };
const snapshot: JSONDataResult<JSONDataSnapshot> = trySnapshotJSON(data, { limits });
const measured: JSONDataResult<JSONDataWork> = tryMeasureJSON(data, { limits, prototypeKeys: 'allow' });
if (!snapshot.ok && snapshot.error.details) {
  const budget: keyof JSONDataLimits = snapshot.error.details.budget;
  void budget;
}
void measured;
const encoded: JSONDataResult<JSONDataEncoding> = tryStringifyJSON(data, { limits });
if (encoded.ok) { const source: string = encoded.value.source; void source; }
// @ts-expect-error Emission requires explicit limits.
tryStringifyJSON(data);
const parsed: JSONTextResult<JSONTextSnapshot> = tryParseJSON('{"amount":0}', { limits });
if (parsed.ok) { const bytes: number = parsed.value.work.sourceBytes; void bytes; }
// @ts-expect-error Raw parsing requires explicit data limits too.
tryParseJSON('{}');
// @ts-expect-error Text parsing does not accept live data objects.
tryParseJSON({}, { limits });
// @ts-expect-error Explicit limits are required rather than an implicit unbounded operation.
trySnapshotJSON(data);
// @ts-expect-error Only the declared own-key policy is supported.
tryMeasureJSON(data, { limits, prototypeKeys: 'ignore' });
// @ts-expect-error All four input bounds must be supplied.
trySnapshotJSON(data, { limits: { maxInputBytes: 1 } });
// @ts-expect-error Executable capabilities are not JSON data.
const executable: JSONValue = { render: () => null };
void executable;
