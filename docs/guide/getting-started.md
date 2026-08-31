# Getting started

If you are building a Vue interface, keep the default **Vue** selection below. Choose DOM for existing browser markup, Terminal for a terminal application, or Core only when you are building a custom renderer or testing interaction rules without a host.

## Install the selected package

<HostInstall />

Sectile packages require Node.js 24 or newer for development, SSR, and Node terminal integration. Browser-only bundles still follow the browser support contract of the application that ships them.

## Import one component

Every component has a public subpath. The default example imports the Vue Checkbox parts; changing the package choice above shows the corresponding host import.

<PackageImport component="checkbox" />

## Next steps

- Open [Checkbox](/components/checkbox) to copy a complete working example and see its API.
- Read [Styling](/guide/styling) to apply your product's CSS.
- Read [State ownership](/guide/state-ownership) when a value must be controlled by application state.
