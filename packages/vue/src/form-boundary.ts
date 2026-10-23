/** Independent content retains the Form root and establishes fresh field ownership. */
import { provideFormBoundary as provideBoundary } from './form/context.js';
// Keep this optional-domain-free entry's declarations independent of Form state contracts.
export const provideFormBoundary: () => void = provideBoundary;
export { useFormFieldDefaults, provideFormControlReset, type FormFieldDefaults } from './form/control.js';
