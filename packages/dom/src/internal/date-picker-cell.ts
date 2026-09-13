export function setDatePickerCellAvailability(element: HTMLElement, available: boolean): void {
  element.setAttribute('aria-disabled', String(!available));
  if ('disabled' in element) (element as HTMLElement & { disabled: boolean }).disabled = !available;
  if (available) delete element.dataset['unavailable'];
  else element.dataset['unavailable'] = '';
}

export function setDatePickerCellFocusEntry(
  element: HTMLElement,
  available: boolean,
  highlighted: boolean,
): void {
  element.tabIndex = available && highlighted ? 0 : -1;
}

export function setDatePickerGridFocusEntry(grid: HTMLElement, highlightedAvailable: boolean): void {
  grid.tabIndex = highlightedAvailable ? -1 : 0;
}

export function focusDatePickerEntry(grid: HTMLElement): void {
  const entry = grid.tabIndex === 0
    ? grid
    : grid.querySelector<HTMLElement>('[tabindex="0"]');
  entry?.focus();
}
