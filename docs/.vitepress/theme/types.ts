export interface EventEntry {
  readonly revision: number;
  readonly event: string;
  readonly accepted: boolean;
  readonly effects: readonly string[];
}
