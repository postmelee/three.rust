# AGENTS.md

Operational rules for every coding agent working in this repository, including Codex and Claude Code. This file is loaded into the system prompt on every turn, so keep only the policies, constraints, and indexes that must always be present. Put detailed procedures in manuals and SKILL files.

## Project Overview

three.rust investigates whether persistent Rust/WebAssembly CPU engine state can improve real Three.js applications while preserving a bounded JavaScript API. The local ESM package is rthree. The M0–M2 transform experiment is implemented and measured; whole-frame acceleration and complete compatibility are not established.

## Core Hyper-Waterfall Rules

This project uses the **Hyper-Waterfall** methodology. Read these rules carefully because they can conflict with an agent's default behavior, especially fast execution and autonomous edits. Details: [`agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md).

- Request task requester approval before modifying source files.
- Track work by GitHub Issue.
- Never skip the order for new features, bug fixes, or structural changes: `Issue -> branch -> daily task board -> plan -> implementation -> verification -> final report -> PR`.
- Do not move to the next stage without approval after completing the current stage.
- If the scope is unclear or could conflict with existing work, ask first.
- Do not revert changes made by the user or another worker.
- Close an Issue only after task requester approval or after confirming the PR was merged.
- Before editing documentation, read the existing content first, change only the necessary parts, and add content only when needed.
- When creating, moving, or editing product, user, contributor, external integration, API, architecture, or roadmap documentation, record a document location judgment in the task plan and get approval.
- `mydocs/manual` is not the target project's product documentation location. The target project must explicitly choose its official documentation root, such as `docs/`, `specs/`, `site/`, `website/`, or `adr/`, in a separate task.
- After work is complete, clean up local and remote artifacts that are not needed for the next task.
- After PR merge and Issue close, return to `main` and remove unneeded `local/task{number}` branches and temporary worktrees.

**Approval assumption rule**: Treat the stage as approved only when the task requester explicitly says to continue in the same thread, such as "continue" or "proceed to the next stage."

## Naming Rules

- Milestone: `M{version}` (for example, M100=v1.0.0, M05x=v0.5.x). Document filenames use lowercase `m{number}` (for example, `m100`).
- Branches: `local/task{issue_number}` for work, `publish/task{issue_number}` for PR publication to `main`.
- Commit messages:
  - Basic: `Task #{number}: summary`
  - Stage: `Task #{number} Stage {N}: summary`
  - Substage: `Task #{number} [Stage {N.M}]: summary`
  - Report bundle: `Task #{number} Stage {N} + final report: summary`
- Document filename: `task_{milestone}_{issue_number}{_impl|_stage{N}|_report}?.md`. New documents must include the milestone. Details: [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md).
- Write all documents in the selected Hyper-Waterfall locale for this repository.

## Mandatory Rules Before Changes

Repository-specific precedence (explicit task requester instructions):
- Task #21 explicitly authorizes integration of the M0–M2, ownership-roadmap and current status/preparation work into main after verification. This supersedes the completed adoption task's no-merge restriction below. Preserve historical commits, branches and raw data.
- Write public documentation, Issues, PRs and repository work artifacts in English. Communicate with the task requester in Korean.
- Keep the requested `codex/` branch prefix for work and publication; this overrides the generic `local/taskN` and `publish/taskN` naming examples below and in manuals.
- Preserve the existing M0–M2 branch, draft PR #1, commits and raw measurements. Do not retrospectively claim they followed Hyper-Waterfall.
- The repository currently uses main as its integration/release branch. Do not create a devel branch or a main-to-main release PR. A distinct release branch requires a separate decision.
- For this adoption only, start from codex/independent-m0-m2 at 9c55b6c6a5e08481f49882ef76dd3d66b2c19f14 on a separate codex/ branch and use a stacked draft PR against that parent. Do not merge PR #1 as part of adoption.
- Existing docs/ and docs/adr/ are preserved during adoption. Their formal documentation-location decision and English report conversion belong to a separate documentation task.

Existing project contract, retained:

### three.rust development contract

Read docs/PROJECT_PLAN.md, docs/COMPATIBILITY.md, docs/BENCHMARKS.md and docs/CLOUD_SETUP.md before implementation. The latest user priority is desktop-first public Three.js examples, not mandatory giraffe integration.

### Architecture

- Preserve the tested Three.js JavaScript API while moving persistent scene data and bulk CPU computation into Rust/Wasm.
- External JS objects need not mirror Rust class layouts. Keep small scalar math in JS unless measurement justifies a boundary crossing.
- Start with one measured subsystem and an actual browser renderer integration. A Rust-to-JS Three.js binding or standalone math microbenchmark is not the requested port.
- Three.js 0.186.1 is the initial comparison pin. Keep the same renderer/backend, assets, camera, quality and work on both sides.
- Avoid global prototype monkey patches and duplicated computation. Document any version-specific integration hook and fallback.

### Evidence

- Complete M0 measurement and write a target-selection ADR before choosing the Rust port.
- Preserve raw samples, environment metadata, upstream source hashes, adaptation diffs and reproduction commands.
- Include small/static and GPU-heavy controls and unfavorable results. Distinguish object API, opt-in batch API and kernels.
- Include JS/Wasm synchronization, copying and result materialization in product timing.
- Cloud software-renderer measurements are not real desktop GPU performance. Label unavailable GPU data and hardware validation honestly.
- Never fabricate metrics or claim a milestone merely because a file exists. Correctness includes hierarchy semantics, synchronous reads, explicit force updates and numerical outputs.
- Preserve third-party license notices. Do not copy giraffe photographs or uncertain-license models into this repository.

### Workflow

- Use codex/ branch names for implementation. Keep package and toolchain versions reproducible with lockfiles.
- Provide install/build/test/benchmark commands and CI using those commands.
- Do not publish to npm automatically; package-name availability is unverified. A local installable rthree alpha and GitHub implementation are in scope.
- Report commands actually executed and unresolved limitations. When a network or environment capability is unavailable, preserve completed work and identify the exact blocker.

## Required References

- [`README.md`](README.md) - project overview, setup, and build
- [`mydocs/manual/document_structure_guide.md`](mydocs/manual/document_structure_guide.md) - `mydocs/` folder roles, document filenames, external PR folder policy, Skills location policy
- [`mydocs/manual/task_workflow_guide.md`](mydocs/manual/task_workflow_guide.md) - 15 task workflow steps, commit message rules, work time rules
- [`mydocs/manual/git_workflow_guide.md`](mydocs/manual/git_workflow_guide.md) - branch policy, Git diagrams, maintainer/contributor workflow
- [`mydocs/manual/pr_process_guide.md`](mydocs/manual/pr_process_guide.md) - external contributor PR review
- [`mydocs/manual/agent_code_hyperfall_rule_conflict.md`](mydocs/manual/agent_code_hyperfall_rule_conflict.md) - conflicts between Hyper-Waterfall and default agent behavior
- `docs/PROJECT_PLAN.md`, `docs/COMPATIBILITY.md`, `docs/BENCHMARKS.md`, `docs/CLOUD_SETUP.md`, `docs/ARCHITECTURE.md`, `docs/REPORT.md`, and `docs/adr/0001-first-cpu-slice.md` (existing project documents; preserve their evidence and scope).

## Agent Skills

Fixed Hyper-Waterfall procedure points are separated into SKILL files. The source of truth is `mydocs/skills/`. Codex (`.agents/skills`) and Claude Code (`.claude/skills`) read the same content through symbolic links. Details: the "Agent Skills location policy" section in [`document_structure_guide.md`](mydocs/manual/document_structure_guide.md).

## Work Rules

- The task requester decides when work starts and ends. Agents do not propose ending work or impose time limits on their own.
