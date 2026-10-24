# Task #5 preparation: reproducible application tooling

Base: e30133cdb147d0433bc99e01678f14205089975b. This is the approved reproduction/correctness preparation unit; engine implementations and performance execution remain separate.

## Changes
- Add immutable upstream checkout/build preparation with Yarn 1.22.22 and frozen viewer lockfile; retain Editor's shipped browser build.
- Pin 15 remote runtime/font/decoder/license resources by SHA-256; mirror exact resource bytes in an isolated browser context. Unknown remote requests fail closed. No application source patches.
- Add headed Chrome/physical GPU checks, original viewer UI checks, Editor native loader/commands/picking/history/idle checks, and fixed-state image/numeric A/A capture. Refuse existing result directories; record actual served file hashes and source/tool identities.

## Development verification
Native smoke 004 loaded both original applications with no missing/page resources. Correctness development run 005 passed six exact pixel/numeric A/A checkpoints and native interaction checks. Earlier failed directories are retained: incomplete local partial-clone copies, incorrect Vite static mount, ambiguous canvas selector, missing webfont, unhandled Editor import dialog, stale selection-helper pose, and dat.gui input overwritten by live display refresh. These are tooling-development attempts, not benchmark evidence. A clean committed-tooling run including loaded-weight normalization follows this commit.

## Original behavior found
The unchanged RobotExpressive asset yields 752 ACCESSOR_WEIGHTS_NON_NORMALIZED errors and four skin-node warnings in the original viewer validator. Both pinned GLTFLoaders explicitly call normalizeSkinWeights. Preserve the malformed-file report and test loaded weights separately; never call the asset spec-conformant. Walking contains morph-weight tracks. Manual morph inputs must be checked with the clip stopped; dat.gui listen can overwrite a text edit between fill and blur, so the automated exact value uses an atomic DOM change event. Editor selected bounds need its native animation loop to refresh before a fixed-pose image capture.

## Limits
No CPU profiles, primary timings, engine comparisons, performance A/A, FPS claims, main merge or deployment. Gizmo drag, focus/timeline/light GUI replay and arbitrary optional formats/environments remain outside the automated smoke. Original app sources remain clean. The shared fixture is authored through native APIs and is distinguished from shipped scenes.
