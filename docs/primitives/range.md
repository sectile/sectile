# Range

`range` is represented by exact `origin`, positive `step`, and integer `count`. The authoritative coordinate is a tick; cardinality is `count + 1`.

Finite decimal strings are parsed into exact integer arithmetic. Floating-point accumulation is not used. `clamp`, `snap`, ratio conversion, and tie handling are explicit. Supported ties are `lower`, `upper`, and `even-tick`.

`createBoundedRange` accepts `min`, `max`, and `step` only when the upper endpoint is exactly on the lattice.
