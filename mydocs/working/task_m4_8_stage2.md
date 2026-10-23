# Task #8 stage 2 — browser, package and public contract

| Artifact | Result |
|---|---|
| Chromium contract | Same 16 scenarios pass in four isolated pages; two-camera callbacks, world/model-view observations and pixels match |
| Fresh tarball consumer | Failed init and concurrent retry, mixed-mode rejection, root/addon identity and one-core bundling pass |
| TypeScript | NodeNext and Bundler pass in the isolated consumer; palette nullability is handled according to upstream declarations |
| Public contract | docs/FACADE_CONTRACT.md maps every scenario and defines C2 mutation/read/fallback requirements |
| CI | Contract command and JSON/image artifact paths added to correctness workflow |
| Progress | Docs explain the new behavioral baseline; ownership tiles, history and product states unchanged |

The browser reports Chromium 154.0.8037.57 with SwiftShader. These checks establish
same-device correctness, not physical GPU performance. The first expanded type
probe assumed a nonnullable palette; it now narrows the actual upstream declaration.
No engine defect or new Rust ownership was introduced by these corrections.

`npm run docs:check` passes. Final clean-commit contract artifacts and existing
native/differential/browser checks are collected in stage 3. No public session
prompt, model configuration or Mac assignment document is added.
