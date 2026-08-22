import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { AccordionContent, AccordionItem, AccordionRoot, AccordionTrigger } from '@sectile/vue/accordion';
import { CheckboxIndicator, CheckboxRoot } from '@sectile/vue/checkbox';
import { DisclosureContent, DisclosureRoot, DisclosureTrigger } from '@sectile/vue/disclosure';
import { SwitchRoot, SwitchThumb } from '@sectile/vue/switch';
import { ToggleButton } from '@sectile/vue/toggle-button';
import { TextField } from '@sectile/vue/text';
import { ListboxItem, ListboxRoot } from '@sectile/vue/listbox';
import { RadioGroupItem, RadioGroupRoot } from '@sectile/vue/radio-group';
import { TabsContent, TabsRoot, TabsTrigger } from '@sectile/vue/tabs';
import { SliderRoot, SliderThumb } from '@sectile/vue/slider';
import { DateField } from '@sectile/vue/date-field';
import { DateTimeField } from '@sectile/vue/date-time-field';
import { NumberField } from '@sectile/vue/number-field';
import { TimeField } from '@sectile/vue/time-field';
import { SpinButtonInput, SpinButtonRoot } from '@sectile/vue/spin-button';

test('Vue playground catalogs every public DOM component', async () => {
  const [domPackageSource, appSource, catalogCaseSource, catalogCodeSource, scenarioSource] = await Promise.all([
    readFile(new URL('../../../packages/dom/package.json', import.meta.url), 'utf8'),
    readFile(new URL('../src/App.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/CatalogCase.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/catalog-code.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/catalog-scenarios.ts', import.meta.url), 'utf8'),
  ]);
  const domPackage = JSON.parse(domPackageSource);
  const expected = Object.keys(domPackage.exports)
    .filter((subpath) => subpath.startsWith('./') && subpath !== './package.json')
    .map((subpath) => subpath.slice(2))
    .sort();
  const componentIDsSource = appSource.match(/const componentIDs = \[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(componentIDsSource, 'App.vue must declare the component catalog');
  const actual = [...componentIDsSource.matchAll(/'([^']+)'/g)]
    .map((match) => match[1])
    .sort();

  assert.deepEqual(actual, expected);
  assert.match(appSource, /<CatalogCase[^>]+:component="activeComponent"/);

  const partsSource = catalogCaseSource.match(/const parts:[\s\S]*?= \{([\s\S]*?)\n\};/)?.[1];
  assert.ok(partsSource, 'CatalogCase.vue must declare each rendered compound API');
  const catalogIDs = [...partsSource.matchAll(/(?:^|[,\n]\s*)(?:'([^']+)'|([a-z][\w-]*))\s*:/g)]
    .map((match) => match[1] ?? match[2]);
  const missingExamples = catalogIDs.filter((id) => (
    !catalogCodeSource.includes(`  '${id}': sfc(`)
    && !catalogCodeSource.includes(`  ${id}: sfc(`)
  ));
  assert.deepEqual(missingExamples, []);
  assert.doesNotMatch(catalogCodeSource, /Compound parts remain unstyled/);
  assert.match(catalogCodeSource, /<FeedRoot :items="activities">/);
  assert.match(appSource, /v-for="scenario in catalogScenarios\[activeComponent\]"/);
  for (const id of catalogIDs) {
    assert.ok(
      scenarioSource.includes(`  '${id}': scenarios(`) || scenarioSource.includes(`  ${id}: scenarios(`),
      `${id} needs multiple real playground scenarios`,
    );
  }
  assert.doesNotMatch(catalogCodeSource, /item\.type === 'page' \? item\.page : '…'/);
});

test('Vue playground composes Checkbox through its public package subpath', () => {
  assert.equal(CheckboxRoot.name, 'SectileCheckboxRoot');
  assert.equal(CheckboxIndicator.name, 'SectileCheckboxIndicator');
});

test('Vue playground composes checked and expansion controls through public subpaths', () => {
  assert.equal(SwitchRoot.name, 'SectileSwitchRoot');
  assert.equal(SwitchThumb.name, 'SectileSwitchThumb');
  assert.equal(ToggleButton.name, 'SectileToggleButton');
  assert.equal(DisclosureRoot.name, 'SectileDisclosureRoot');
  assert.equal(DisclosureTrigger.name, 'SectileDisclosureTrigger');
  assert.equal(DisclosureContent.name, 'SectileDisclosureContent');
  assert.equal(AccordionRoot.name, 'SectileAccordionRoot');
  assert.equal(AccordionItem.name, 'SectileAccordionItem');
  assert.equal(AccordionTrigger.name, 'SectileAccordionTrigger');
  assert.equal(AccordionContent.name, 'SectileAccordionContent');
  assert.equal(TextField.name, 'SectileTextField');
  assert.equal(ListboxRoot.name, 'SectileListboxRoot');
  assert.equal(ListboxItem.name, 'SectileListboxItem');
  assert.equal(RadioGroupRoot.name, 'SectileRadioGroupRoot');
  assert.equal(RadioGroupItem.name, 'SectileRadioGroupItem');
  assert.equal(TabsRoot.name, 'SectileTabsRoot');
  assert.equal(TabsTrigger.name, 'SectileTabsTrigger');
  assert.equal(TabsContent.name, 'SectileTabsContent');
  assert.equal(SliderRoot.name, 'SectileSliderRoot');
  assert.equal(SliderThumb.name, 'SectileSliderThumb');
  assert.equal(NumberField.name, 'SectileNumberField');
  assert.equal(DateField.name, 'SectileDateField');
  assert.equal(TimeField.name, 'SectileTimeField');
  assert.equal(DateTimeField.name, 'SectileDateTimeField');
  assert.equal(SpinButtonRoot.name, 'SectileSpinButtonRoot');
  assert.equal(SpinButtonInput.name, 'SectileSpinButtonInput');
});
