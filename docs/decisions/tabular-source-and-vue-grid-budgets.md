# Tabular package and Vue grid bundle budgets

Status: Accepted
Date: 2026-11-23

## Context

Range materialization adds access-window reuse and grouped context reads to the existing Tabular source export. Keyed row and cell projection adds state to the DOM grid and keeps Vue slot subscriptions local to the fields each consumer reads. The branch combined these changes with the existing eager source and public grid contracts. [First deep-verification run](https://github.com/sectile/sectile/actions/runs/45129136634)

The first run measured 176,868 JavaScript bytes in the Tabular package. Sharing the window reader, expansion traversal, and cell writing logic reduced it to 175,298 bytes. The prior verified package used 173,253 bytes. The package now ships 2,045 additional JavaScript bytes for the alternative materialization path.

The same run reported a two-byte DOM gzip overage. Removing a redundant pair of membership checks from the selection update brought the DOM fixture within its existing budget. Four Vue grid fixtures still exceeded their limits. Their additional code implements slot subscriptions and incremental host projection. All retain the existing external dependency set.

## Decision

Keep both materialization modes on the existing public source export and keep the bounded slot and selection updates. An additional export would change integration and require consumers to select a second source entry point. Dropping the incremental DOM projection would restore repeated mounted-cell work on selection.

Set the Tabular JavaScript ceiling to 176,000 bytes, up from 174,000, with 702 bytes of headroom at the measured size. Record the four affected named Vue fixture measurements and retain the existing five-percent-plus-16-byte policy. All sizes below are raw / gzip / brotli bytes.

| Fixture | Bundler | Previous baseline | Previous gate | Measured baseline | Resulting gate |
| --- | --- | ---: | ---: | ---: | ---: |
| DataGrid | esbuild | 44,731 / 13,316 / 12,046 | 46,984 / 13,998 / 12,665 | 49,588 / 14,852 / 13,465 | 52,084 / 15,611 / 14,155 |
| DataGrid | vite | 43,939 / 12,914 / 11,702 | 46,152 / 13,576 / 12,304 | 48,757 / 14,438 / 13,060 | 51,211 / 15,176 / 13,729 |
| DataTreeGrid | esbuild | 47,073 / 13,976 / 12,697 | 49,443 / 14,691 / 13,348 | 49,786 / 14,884 / 13,488 | 52,292 / 15,645 / 14,179 |
| DataTreeGrid | vite | 46,202 / 13,569 / 12,320 | 48,529 / 14,264 / 12,952 | 48,955 / 14,477 / 13,111 | 51,419 / 15,217 / 13,783 |
