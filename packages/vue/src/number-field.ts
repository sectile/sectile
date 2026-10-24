import { nextTick, onBeforeUnmount, type PropType } from 'vue';
import {
  createNumberField,
  type NumberFieldConnection,
  type NumberFieldOptions,
} from '@sectile/dom/number-field';
import { createNativeFieldComponent, type NativeFieldFactoryOptions, type NativeFieldCommandHost } from './input/native-field.js';

export interface NumberFieldProps {
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly policies?: NumberFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
}

type NumberFieldPolicies = NonNullable<NumberFieldOptions['policies']>;

export type NumberFieldEditResult = { readonly status: 'accepted'; readonly value: string | null }
  | { readonly status: 'rejected'; readonly reason: 'unavailable' | 'disabled' | 'readonly' | 'composing' | 'busy' | 'invalid' | 'refused' };
export interface NumberFieldExpose {
  getText(): string | null;
  commitValue(value: string | null): Promise<NumberFieldEditResult>;
  clear(): Promise<NumberFieldEditResult>;
  stepBy(delta: string): Promise<NumberFieldEditResult>;
}
interface CommandPort { host: NativeFieldCommandHost<string> | undefined; editing: boolean }
function numberCommands(port: CommandPort): NumberFieldExpose {
  const reject = (reason: Extract<NumberFieldEditResult, { status: 'rejected' }>['reason']): NumberFieldEditResult => ({ status: 'rejected', reason });
  const command = async (apply: (target: NumberFieldConnection) => boolean): Promise<NumberFieldEditResult> => {
    const host = port.host, target = host?.connection as NumberFieldConnection | undefined;
    if (!host?.mounted || !target) return reject('unavailable');
    if (host.disabled) return reject('disabled');
    if (host.readOnly) return reject('readonly');
    if (host.composing) return reject('composing');
    if (port.editing) return reject('busy');
    port.editing = true;
    try {
      if (!apply(target)) return reject('invalid');
      const proposal = target.getText(); await nextTick();
      if (port.host !== host || !host.mounted || host.connection !== target) return reject('unavailable');
      target.handleEvent('cancel');
      return target.getText() === proposal ? { status: 'accepted', value: target.getValue() } : reject('refused');
    } finally { port.editing = false; }
  };
  return { getText: () => port.host?.connection?.getText() ?? null,
    commitValue: value => command(target => target.handleEvent({ type: 'set-value', value })),
    clear: () => command(target => target.handleEvent({ type: 'set-value', value: null })),
    stepBy: delta => command(target => target.handleEvent({ type: 'step', delta })) };
}
const NumberFieldImplementation = createNativeFieldComponent<string, NumberFieldPolicies>({
  name: 'SectileNumberField',
  scope: 'number-field',
  inputMode: 'decimal',
  formatValue: (value) => value,
  valueType: String as unknown as PropType<string | null>,
  exposeValueCommands(host, expose) {
    const port: CommandPort = { host, editing: false }; expose(numberCommands(port)); onBeforeUnmount(() => { port.host = undefined; });
  },
  commitValue: (connection, value) => (connection as NumberFieldConnection).handleEvent({ type: 'set-value', value }),
  create: (options: NativeFieldFactoryOptions<string, NumberFieldPolicies>): NumberFieldConnection => {
    const { onValueChange, policies, ...rest } = options;
    return createNumberField({
      ...rest,
      ...(policies === undefined
        ? {}
        : { policies }),
      onValueChange: ({ value }) => onValueChange(value),
    });
  },
});
export const NumberField = NumberFieldImplementation as typeof NumberFieldImplementation & {
  new(): InstanceType<typeof NumberFieldImplementation> & NumberFieldExpose;
};
