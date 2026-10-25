# Task #31 implementation plan

Keep schema-3 source counts and historical observations unchanged. Add six product gates as a separate schema-1 inventory with stable IDs, target summaries, current evidence, status and issue references. The Python progress generator emits a readiness SVG and embeds the same overview/table above the ownership map in progress.html. README embeds the SVG and keeps the fine-grained implementation map in a details section; its history stays reachable.

Validation checks unique IDs, known states, existing local evidence, and a qualification record for any Qualified state. This checks traceability only, never certifies the truth of a claim automatically. Tests exercise invalid claims and unchanged source counts. Existing Pages build needs no extra copied assets for the inline HTML overview; the README SVG remains a repository asset. Verify responsive page behavior and preserve all historical counts.

## Final presentation override
Remove the newly introduced readiness SVG generator/artifact and responsive card styling. Keep the original ownership diagram and source summary tables first, insert a basic HTML product-goal table before the existing Definitions and evidence, and preserve history byte-for-byte. Generate the README Markdown gate table from the same inventory using scoped markers; keep the old source image visible. Earlier stage records document an intermediate preview, not the final interface.
