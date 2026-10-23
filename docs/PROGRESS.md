# Progress counting and generation

Run `python3 tools/progress.py` (Python 3.10+; no third-party packages) or
`npm run docs:generate`. The single source is `docs/progress-inventory.json`.
The generator writes `docs/progress.json`, `docs/progress.html` and
`docs/assets/progress.svg`. `--check` validates these outputs without changing
files; CI fails if any is stale. There are no timestamps or network-dependent
values in generated output. `npm run test:progress` also produces desktop/mobile
PNG screenshots under ignored `work/progress-validation/` using Chromium.

Open docs/progress.html directly in a browser, or run `npm run dev` and open
http://127.0.0.1:4173/docs/progress.html. The portable demo artifact includes the
page, JSON and SVG under docs/. It works without JavaScript or network access;
evidence links lead to the repository. GitHub's blob view shows HTML source,
not a hosted website. This task does not configure or claim a Pages deployment.

## Denominators and meaning

- **CPU capabilities:** 29 explicitly named items across seven subsystems.
  Six scoped transform capabilities currently run in Rust. One tile is one
  inventory item, not a function, source line, equal development effort or
  measured CPU cost. This denominator is intentionally incomplete and can
  change when the contract is refined; it is not the full Three.js API.
- **Evidence gates:** 12 named research/verification criteria. Seven have
  recorded supporting evidence. The broad whole-frame gain criterion is amber:
  no general gain is established and the measured hierarchy regressed. Four
  criteria remain pending. Passed evidence is a reviewed snapshot of the named
  environment/scope, not a live CI status or an all-platform guarantee.
- Gray means outstanding; green means implemented (CPU panel) or passed
  (evidence panel). Amber records an unfavorable outcome. Text in the table
  and item details provides the same information without relying on color.
- JS forwarding, retained animation/skeleton calculations and GPU shaders do
  not count as Rust implementations. A transform test passing does not establish
  a Rust animation implementation. GPU shader work is not removed by a CPU port.

Status is deliberately curated from source, tests and recorded reports. The
script validates unique IDs, allowed states and evidence paths, then calculates
counts. It does not infer semantic completeness from a function body, a symbol
name, a stub's absence or an open/closed issue. Change an item's state only with
reviewable implementation and evidence. CI checks generation and inventory
integrity; it cannot automatically certify the truth of a manual status claim.
The sourceRef field points at the active review branch and should be changed
when the work is integrated. Git history records inventory changes; no synthetic
historical series is generated.

## Reference

The requested presentation reference is [AnyPS5 progress](https://boykopovar.github.io/AnyPS5/progress.html),
its [JSON](https://boykopovar.github.io/AnyPS5/progress.json) and
[generator](https://github.com/boykopovar/AnyPS5/blob/main/tools/progress.py).
That project counts declared library functions and decoded shader instructions.
Those units do not transfer to a state-ownership experiment. Its repository
license is GPL-2.0; our Python-standard-library generator is independently
implemented, using a recursive split layout and this project's own inventory.
No AnyPS5 implementation code or generated artwork is included.
