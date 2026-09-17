import type { TextSelectionInput } from '@sectile/core/text';

export type TextInput =
  | {
      readonly type: 'beforeinput';
      readonly inputType: string;
      readonly data?: string | null;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'input';
      readonly inputType: string;
      readonly text: string;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'composition-start';
      readonly text: string;
      readonly startCodeUnitOffset: number;
      readonly endCodeUnitOffset: number;
      readonly selection: TextSelectionInput;
    }
  | {
      readonly type: 'composition-update';
      readonly text: string;
      readonly selection: TextSelectionInput;
    }
  | { readonly type: 'composition-commit' }
  | { readonly type: 'composition-cancel' };

export type TextElement = HTMLInputElement | HTMLTextAreaElement;
