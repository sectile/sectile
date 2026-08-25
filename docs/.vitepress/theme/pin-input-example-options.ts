export interface PinInputExampleOptions {
  readonly length: number;
  readonly value: string;
  readonly placeholder: string;
  readonly mask: boolean;
  readonly otp: boolean;
  readonly readonly: boolean;
  readonly disabled: boolean;
}

export function pinInputExampleOptions(scenario: string): PinInputExampleOptions {
  return Object.freeze({
    length: scenario === 'custom-length' ? 4 : 6,
    value: scenario === 'readonly' ? '246810' : scenario === 'disabled' ? '593174' : '',
    placeholder: scenario === 'placeholders' ? '○' : '',
    mask: scenario === 'masked',
    otp: scenario === 'otp',
    readonly: scenario === 'readonly',
    disabled: scenario === 'disabled',
  });
}
