import { observeTextInk, type TextInkMetrics, type TextInkConnection } from '@sectile/dom/text';
const connection: TextInkConnection = observeTextInk({ element: document.createElement('input'), text: () => 'Ada', freezeWhileEditing: true,
  onChange(metrics) { if (metrics) { const ink: TextInkMetrics = metrics; const height: number = ink.ascent + ink.descent; void height;
    // @ts-expect-error Measurements are readonly browser output.
    ink.ascent = 1;
  } },
});
connection.refresh(); connection.disconnect();
