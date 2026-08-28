# Getting started

Pick the package you want to use. The install command and code examples below follow that choice.

## Install the selected package

<HostInstall />

Sectile packages require Node.js 24 or newer for development, SSR, and Node terminal integration. Browser-only bundles still follow the browser support contract of the application that ships them.

## Import one component

Every component is available from a public subpath. Importing that subpath shows which behavior the application uses and keeps the bundle boundary explicit.

<PackageImport component="checkbox" />

## Next steps

- Read [State ownership](/guide/state-ownership) before deciding who manages state.
- Read [Styling](/guide/styling) when you are ready to shape the component for your interface.
- Open [Checkbox](/components/checkbox) for a complete example and API reference.
