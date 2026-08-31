---
title: SSR and hydration
description: Keep server-rendered Form markup, values, issues, IDs, and external controls stable through hydration.
---

# SSR and hydration

SSR is a host concern rather than a separate Form model. The server and client must render the same field ownership, native attributes, initial values, issues, and ID relationships. Browser validation, focus movement, interactive validation, and submission begin after hydration.

For a Vue application:

- keep controlled initial values identical on the server and client;
- pass server-known issues into the initial Form state;
- render stable Teleport targets in server HTML;
- preserve native `name`, `form`, `required`, `disabled`, and `readonly` attributes;
- do not read browser-only globals while creating the server tree.

The DOM integration connects after HTML exists and does not provide a separate server renderer. See [Vue SSR and hydration](./vue/ssr) for working patterns and the verified hydration scope.
