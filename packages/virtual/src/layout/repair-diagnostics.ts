export interface VirtualRepairDiagnostics {
  readonly mode: 'incremental' | 'rebuild';
  readonly changed: number;
  readonly touchedBlocks: number;
  readonly copiedNodes: number;
  readonly copiedEntries: number;
  readonly rebuiltItems: number;
  readonly repairBound: number;
}

const diagnostics = new WeakMap<object, VirtualRepairDiagnostics>();

export function recordRepairDiagnostics(state: object, value: VirtualRepairDiagnostics): void {
  diagnostics.set(state, Object.freeze({ ...value }));
}

export function readRepairDiagnostics(state: object): VirtualRepairDiagnostics | null {
  return diagnostics.get(state) ?? null;
}
