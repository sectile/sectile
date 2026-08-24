export function setDatePickerCellAvailability(element: HTMLElement, available: boolean): void {
  element.setAttribute('aria-disabled', String(!available));
  if ('disabled' in element) (element as HTMLElement & { disabled: boolean }).disabled = !available;
  if (available) delete element.dataset['unavailable'];
  else element.dataset['unavailable'] = '';
}
