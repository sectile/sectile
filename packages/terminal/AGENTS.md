## Terminal host boundary

Terminal owns terminal input translation, cell projection, terminal effects,
and terminal resource lifecycle.

- Delegate portable state transitions and Temporal behavior to Core or
  Temporal.
- Terminal-specific key decoding, screen/cell output, focus representation,
  and cleanup remain local.
- Do not copy DOM or Vue semantic helpers; share portable behavior through the
  canonical owner.
