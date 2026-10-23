# Task #34 — concise documentation and cloud/Mac handoffs

Issue: https://github.com/postmelee/three.rust/issues/34
Milestone: M3. Documentation preparation and publication correction; review/merge tracked separately.

## Outcome

Added a documentation entry point and verified-unit editing rules. Split CI/GPU/Mac/
Pages reference by reader task, keeping old CI anchors and commands. Public strategy
and initial requirements are concise; detailed research/provenance remains available
in mydocs/tech. Old preparation is labeled historical, and current architecture
identifies both implemented API paths. Public reports, raw measurements and progress
UI/definitions remain at their existing paths.

The execution plan allocates C1/C2 compatibility, C3 evaluation/render consumption,
R1 SIMD, conditional R2 workers and B1 backend decision to existing issues. Cloud
owns source changes initially; local owns L0 Mac/cohort evidence and later L1 candidate
validation. Every unit has acceptance, handoff and documentation/progress requirements.
The personal session brief is removed from the current tree at the requester's
direction. Those instructions are delivered in chat; shared project plans and
measurement protocols remain public. AGENTS and the documentation guide make this
publication boundary explicit. Active repository, issue and PR links are updated.

## Verification

| Criterion | Check | Result |
|---|---|---|
| Current docs and generated claims | npm run docs:check | Passed: English, generated README tables, source inventory and roadmap |
| Paths and continuity | Relative Markdown links/anchors; old CI commands/section anchors | Passed |
| Research preservation | Compare archived prose to 9527a04 after normalizing link destinations | Passed; only paths/prefaces changed |
| No runtime/progress promotion | Diff engine/scripts/workflows/raw data/generated inventories and UI | Unchanged |
| Prior baseline CI | Query exact heads for #30/#32/#33 | Completed/success on all three; still unmerged |

The public CI entry is 84 lines instead of 232; the public strategy is 49 instead
of 223. Detailed material remains linked rather than deleted. This is a navigation
and task-coordination change, not a source-port progress increment.

## Remaining work and limits

No local session exists from this task and no new hardware, image, native or engine
result is claimed. Mac L0 can start from the explicit code pin; C1 is the first
cloud implementation unit. A newer candidate requires a new immutable handoff.
Existing pending PRs and this stacked draft need review/integration before main
contains these references. No automatic npm publication, paid runner provisioning,
main merge or issue/milestone closure occurs here.

The removal is a forward commit. Earlier Git commits retain their historical content;
this correction does not rewrite repository history or claim historical erasure.
