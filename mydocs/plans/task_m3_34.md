# Task #34 — documentation foundation and cloud/Mac handoffs

Issue: https://github.com/postmelee/three.rust/issues/34
Milestone: M3 — Evidence and project infrastructure

## Purpose and authorization
The requester explicitly asks to proceed in the recommended order, establish a
small documentation cleanup PR, update docs/progress at each verified unit, and
write the cloud/local division and local-session instructions. The requester has
clarified that personal session instructions belong in chat, not the public
repository. This correction removes the published brief and its active references.
Reusable project plans and measurement protocols remain public. No local session
can be created from the available cloud tools; instructions must not imply it exists.

## Baseline
Live main is b5a0fc3. PRs #30/#32/#33 remain open at 8918f7e/fa64d49/9527a04.
Use a separate codex/docs-handoff worktree stacked on #33 at 9527a04. Preserve
existing branches, old measurements and the simple progress UI. Read AGENTS,
Hyper-Waterfall document roles and the existing affected documents before edits.

## Scope
Included: docs entry point and writing/progress rules; split CI operational
instructions; concise public engine strategy with detailed research in mydocs;
clearly labeled historical preparation; sequential verified work units mapped to
existing issues. Deliver personal session instructions only in chat. No new umbrella milestones.
Excluded: engine code, runtime claims, new measured hardware results, main merges,
paid runners, npm publication, changes to progress totals/qualified states.

## Document location judgment
| Artifact | Audience / officialness | Location | Alternative | Reason |
|---|---|---|---|---|
| Navigation, current strategy, CI/GPU/Mac/Pages guides | Users/contributors; official reference | docs/ | mydocs/manual | Public operating contracts are not task memory |
| Historical conversation and exploratory engine comparison | Future workers; dated research, not API contract | mydocs/tech/ | docs/ | Retain provenance without mixing history into current reference |
| Work split, candidate evidence requirements and task acceptance | Contributors; reusable execution record | mydocs/plans/task_m3_34*.md | docs/ | Project coordination belongs with work plans |
| Personal session prompt and model/UI instructions | Requester; direct handoff | Chat only | Public repository | Explicit requester correction; mydocs is also public |
| Public evidence and raw data | Users/reviewers; historical reproducible evidence | Existing docs reports and bench/results | mydocs/report | Keep public performance claims auditable at stable links |

This keeps the previously approved docs/ and docs/adr/ roots. The requester has
explicitly authorized this separation; keep old entry paths as short links.

## Stages
1. Establish document navigation/rules, split operational reference and separate
   exploratory history without changing evidence or generated UI.
2. Specify verified implementation units and cloud/local owners;
   align existing issue references rather than duplicate broad issues.
3. Check docs generation, relative links/retained anchors, executable command syntax
   and unchanged progress/runtime; write report, push a stacked draft PR.
4. Remove the personal session brief and active links; document the publication
   boundary, repeat documentation checks and update the existing PR/issues.

## Verification and risks
Use docs:check, link checks, diff/syntax checks. Changes do not require new engine
or hardware tests. Paths used by the status generator and old reports stay valid.
Preserve all code blocks and protocol values when splitting operational docs;
correct explicitly stale status wording without rewriting historical measurements.
Do not mark any engine unit implemented merely because its plan or issue exists.
