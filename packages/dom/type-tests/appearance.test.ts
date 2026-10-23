import { connectSystemAppearance, type SystemAppearance, type SystemAppearanceConnection } from '@sectile/dom/appearance';
const result = connectSystemAppearance({ document, onChange(appearance) {
  const value: SystemAppearance | undefined = appearance;
  void value;
} });
if (result.ok) {
  const connection: SystemAppearanceConnection = result.value;
  const current: SystemAppearance | undefined = connection.appearance;
  void current;
  // @ts-expect-error An observed fact is readonly, not an appearance setter.
  connection.appearance = 'dark';
  connection.disconnect();
}
// @ts-expect-error SSR callers cannot infer an ambient document.
connectSystemAppearance({ onChange() {} });
// @ts-expect-error Unknown native output is part of the callback contract.
connectSystemAppearance({ document, onChange(appearance: SystemAppearance) { void appearance; } });
