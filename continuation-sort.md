Longest-first continuation sort (short: continuation sort).

Rules (same as CSI–CSIII):

Sort by outer-path length descending (slots after center/M/1).

Equal length after a placed line: walk the outer ring from that line’s last slot in its CW/CCW direction (respect wrapsOuterRing), order ties by start-slot encounter order.

Initial equal-length batch (no previous): inspect the lowest-start candidate’s direction — CW → lowest start first; CCW → highest start first.

