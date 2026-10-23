# Task #7 stage 2 — execute and interpret

Executed CHROMIUM=/usr/bin/chromium node bench/ownership-boundary.mjs
work/ownership-boundary-final-20261023 at clean commit 6c6486c. The driver completed
256 runs with 98,304 timed ticks, 6,144 raw block samples and exact final JS/Wasm
agreement in all five output arrays. Assertions verified invocation and byte counts.

Published all samples, manifest, supplemental environment and the failed pre-sample
attempt under bench/results/ownership-boundary-20261023. The analyzer checks complete
repeat groups, finite samples/clocks and error bounds before summarizing. Block-average
tick medians are not frame percentiles. No engine code, upstream compatibility or
new image/hardware performance result changed. Recommendations are in ADR 0005.
