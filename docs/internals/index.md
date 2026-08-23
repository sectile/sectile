---
title: Internals
description: Architecture, theory, engineering constraints, and verification records behind Sectile.
---

# Internals

This section records the theory, implementation boundaries, and evidence behind Sectile's public packages. Most users can stay in the [guide](/guide/getting-started) and [component catalog](/components/).

## Architecture and theory

- [Architecture](/architecture/) explains how semantic ownership is divided across core theories and host adapters.
- [Theory to runtime](/architecture/theory-to-runtime) traces the refinement from accepted theory to production modules.
- [Composite proof plan](/architecture/composite-proof-plan) defines the bar for promoting a new interaction pattern.
- [Accepted theory](/references/sectile-theory) is the decision-closed specification.

## Core models

- [Core primitives](/primitives/) introduces sequence, range, grid, and tree contracts.
- [Performance](/performance/) records complexity and resource ceilings.

## Engineering and decisions

- [Engineering](/engineering/) covers package, build, naming, and release constraints.
- [Decisions](/decisions/) records public-boundary and migration choices.
- [Getting started for contributors](/getting-started/) covers direct consumption of the public structures and facades.

## Verification and project status

- [Testing](/testing/) explains the evidence classes and verification pipeline.
- [References](/references/) links the specification and reproducibility record.
- [Implementation checklist](/implementation-checklist) and [roadmap](/roadmap) track current coverage and remaining work.
