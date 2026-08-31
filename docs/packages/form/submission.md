---
title: Submission, reset, and reinitialization
description: Handle native and managed submission, files, failures, reset, and new value baselines.
---

# Submission, reset, and reinitialization

Form preserves native browser submission semantics and adds a managed path when JavaScript should save the result.

## Native or managed submission

Leave out `onSubmit` to keep normal `action`, `method`, `enctype`, `target`, and submit-button overrides. Provide `onSubmit` for an asynchronous application save. The managed callback receives native `FormData`, the clicked submitter, and structured values when a schema transforms the input.

Prefer `FormData` for files, repeated names, checkbox and radio omission, and submitter values. Use schema output when the application needs a validated typed object.

Form records submitting, succeeded, and failed outcomes. A rejected request keeps the existing dirty baseline. A successful handler may request `reinitialize()` so the values currently on screen become the new saved baseline.

## Reset is not reinitialization

- `reset()` asks controls to return to their defaults and clears Form state.
- `reinitialize()` leaves the current control values on screen and adopts them as the new baseline.

Both clear lifecycle metadata by default. Reinitialization can preserve selected groups when the product needs that behavior.

See [Vue submission](./vue/submission) for component examples or [DOM forms](./dom/) for an existing `HTMLFormElement`.
