# Task #34 stage 4 — session instruction publication correction

The requester asked to remove the personal local-session brief and deliver it only
in chat. Removed the file and active document references, retained the reusable
execution plan and Mac protocol, and clarified that every tracked directory is public.
The same correction applies to active issue and PR descriptions.

Verification passed: `npm run docs:check`, relative Markdown links/retained CI
anchors and commands, `git diff --check`, and unchanged runtime/progress/raw data
against 9527a04. The first docs check hit sandbox process restrictions; after
rerunning with execution permission and staging the deletion, it passed. No engine
or hardware test is implied. This is a forward removal; previous Git commits remain
historical records. Remote CI and review are tracked separately in PR #35.
