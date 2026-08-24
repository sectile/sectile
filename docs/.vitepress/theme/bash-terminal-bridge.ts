export const SHELL_VIRTUAL_TERMINAL = 1;

export interface TerminalOutputWriter {
  write(data: Uint8Array): void;
}

export function writeShellVirtualTerminal(
  terminal: TerminalOutputWriter | undefined,
  buffer: Uint8Array,
  virtualTerminal: number,
): boolean {
  if (virtualTerminal !== SHELL_VIRTUAL_TERMINAL) return false;
  terminal?.write(buffer);
  return terminal !== undefined;
}
