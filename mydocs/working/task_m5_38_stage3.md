# Task #38 stage 3 — bounded internal read correction

The initial six-repeat regression and later CPU sampling are retained in stage 2.
Added a private matrix read barrier to pinned core math consumers: synchronize one
snapshot and read its backing array within the operation. Public `elements` identity,
direct writes and mutation destinations retain their tracked behavior. Syntax-based
selection and original source hashes guard the additional integration points.

The correction passes 11 native tests, nine legacy differentials, 14 focused facade
checks (including read sources versus write destinations), all six-route Node/browser
semantic cases and exact two-camera callback/pixel comparisons. A fresh full-scene,
installed-package and repeated measurement set follows on this stage's clean commit.
These checks do not establish a performance improvement.

The same internal barrier exists in the matched JS route. No visibility, model-view,
normal-matrix, render-list or animation calculation is newly ported by this fix.
CI also runs the boundary harness as explicitly short diagnostic smoke.

Further review reproduced a callback escape: Vector3.setFromMatrixColumn can pass
its array to an overridden fromArray method. The first correction exposed the
private backing array there. Stop that verification chain before any full timing;
retain its partial correctness outputs in work/. Restrict the optimization to
local reads, preserve public proxies when passing arrays to overridable methods,
and add an alias-plus-pending-write regression case on both facade routes. The
final candidate and its evidence are recorded separately from dbad72e.
