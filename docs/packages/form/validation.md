---
title: Validation and errors
description: Combine browser constraints, application checks, schemas, and server issues in one Form lifecycle.
---

# Validation and errors

Form keeps all validation sources in one ordered issue model without pretending they are the same thing.

## Choose the source that owns the rule

| Source | Use it for |
| --- | --- |
| Native browser constraints | `required`, input type, length, and other HTML constraints |
| Field or application validation | Product rules that can be checked locally |
| Standard Schema | Authoritative input validation and output transformation |
| Server issues | Rejections known only after a save request |

A submission failure such as a network outage is not an invalid field. Form stores it in submission state. Return field-related server issues only when the server rejected specific values.

## Issue identity and focus

An issue may target one primary field and additional related fields. It appears once in the summary while every related field becomes invalid. After a failed submission, the host focuses the earliest rendered invalid field rather than depending on validator return order.

Changing a field clears server issues related to that value; unrelated input does not. `validateOn` and `revalidateOn` decide when interactive checks run, while submission always performs the complete validation pass.

For template code and message composition, see [Vue validation and errors](./vue/validation). For an existing HTML form, configure validation through [DOM forms](./dom/) and the [DOM API](./dom/api).
