# Task #23 — Implementation plan

See [task plan](task_m3_23.md) for authorization, document locations and prerequisites.

| Stage | Files | Checks |
|---|---|---|
| 1 | tools/progress.py, docs/history*, tests/test_progress.py, tests/progress.mjs | Chart values, one-point/empty/legacy behavior, escaping, hover/focus, mobile |
| 2 | scripts/bundle-status.mjs, .github/workflows/pages.yml, README/docs links, tests/status-site.mjs | Freshness, allowlisted artifact, /three.rust/ subpath browser, actionlint |
| 3 | Work reports, PR, main deployment | Applicable CI, exact head/merge, Pages prerequisite and actual public HTTP |

Repository admin capability is required only for first-time Pages activation.
Existing GitHub connector repository content/PR permissions do not imply settings
permissions. The user already requested the public page; an activation request is
for the missing capability, not renewed approval of the implemented feature.
