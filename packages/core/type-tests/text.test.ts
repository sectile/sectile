import { applyTextEvent, createTextEditingState, findTextQuery, type TextEvent, type TextSelectionInput, type TextQuery } from '@sectile/core/text';

const selection: TextSelectionInput = { anchorCodeUnitOffset: 1, focusCodeUnitOffset: 0 };
const event: TextEvent = { type: 'select', selection };
const result = applyTextEvent(createTextEditingState('a'), event);
if (result.ok) {
  const text: string = result.value.state.snapshot.text;
  const direction: 'none' | 'forward' | 'backward' = result.value.state.snapshot.selection.direction;
  void [text, direction];
}
// @ts-expect-error Selection events require an explicit anchor/focus request.
const incomplete: TextEvent = { type: 'select' };
void incomplete;
const query = findTextQuery(createTextEditingState('@Ada'), { trigger: '@', maxQueryCodeUnits: 32 });
if (query.ok) { const matched: TextQuery | null = query.value; void matched; }
// @ts-expect-error Query inspection requires an explicit UTF-16 ceiling.
findTextQuery(createTextEditingState('@Ada'), { trigger: '@' });
