import { inject, provide, type InjectionKey } from 'vue';

export interface PartContract {
  readonly scope: string;
  readonly parts: Readonly<Record<string, string>>;
}

const partContractKey: InjectionKey<PartContract> = Symbol('SectilePartContract');

export function providePartContract(scope: string, parts: Readonly<Record<string, string>> = {}): void {
  provide(partContractKey, { scope, parts });
}

export function usePartContract(defaultScope: string, defaultPart: string): PartContract & { readonly part: string } {
  const contract = inject(partContractKey, undefined);
  if (contract === undefined) return { scope: defaultScope, parts: {}, part: defaultPart };
  return { ...contract, part: contract.parts[defaultPart] ?? defaultPart };
}
