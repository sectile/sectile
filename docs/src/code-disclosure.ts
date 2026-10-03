const expandedLineLimit = 18;
const expandedColumnLimit = 100;

/** Source-based geometry keeps the initial disclosure identical in SSR and client rendering. */
export function codePresentation(source: string): { readonly lineCount: number; readonly initiallyOpen: boolean } {
  const displayed = source.trim();
  const lines = displayed ? displayed.split(/\r\n?|\n/u) : [];
  const initiallyOpen = lines.length <= expandedLineLimit && lines.every((line) => {
    let columns = 0;
    for (const _character of line) if (++columns > expandedColumnLimit) return false;
    return true;
  });
  return { lineCount: lines.length, initiallyOpen };
}
