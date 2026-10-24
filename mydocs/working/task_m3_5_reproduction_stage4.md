# Task #5 preparation: native UI evidence

Clean tooling `87f39caa835599f56937e0035502c3f2904cd44b`, command `node scripts/apps/ui.mjs work/app-reproduction-002 work/app-ui-003`: 40 checks passed, including four exact numeric/image reload A/A pairs. Original Editor, Chrome 155, M4 Pro ANGLE Metal, AC power, uncontrolled desktop activity; correctness only.

New archive `bench/results/app-ui-preparation-20261024` preserves final raw observations, pointer traces, image/numeric checkpoints, conditions and development failures. See the [UI completion report](../report/task_m3_5_ui_report.md) for bounded native input coverage, diagnostic boundaries and unresolved asset/version limitations. The initial evidence archive is untouched. No timing/profile/candidate comparison was executed; #5 remains open and PR #41 remains draft.
