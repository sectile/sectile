import { watch } from 'vue';

export function useControlledStateInvariant(
  component: string,
  property: string,
  read: () => unknown | undefined,
): boolean {
  const controlled = read() !== undefined;
  let warned = false;
  watch(read, (value) => {
    if (warned || (value !== undefined) === controlled) return;
    warned = true;
    console.warn(
      `[Sectile] ${component} cannot switch ${property} ownership. Remount.`,
    );
  });
  return controlled;
}
