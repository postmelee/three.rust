# Status publication and roadmap automation

[CI overview](CI.md)

## Public status site

`.github/workflows/pages.yml` builds an allowlisted status site on main pushes or
trusted manual dispatch: progress HTML/JSON/SVG, interactive history HTML/JSON/SVG,
an index and build provenance. Full first-parent history supplies the last committed
schema-3 inventory per UTC day. No engine binary, model, environment dump or private
file is published. Correctness CI checks the artifact at the `/three.rust/` subpath
on desktop/mobile. The main build verifies generated-file freshness before uploading.

A repository administrator must first set **Settings → Pages → Build and deployment
→ Source: GitHub Actions**. Initial activation requires repository administration
permission, which ordinary content/PR connectors and GITHUB_TOKEN do not provide.
The deploy job uses only `pages:write` and `id-token:write`, the `github-pages`
environment and official configure/upload/deploy actions. PR code cannot deploy.
If activation is missing, the deployment fails visibly; enable it and rerun the
failed job. A successful artifact build alone is not proof of a live website.

Published URLs after successful deployment:

- https://postmelee.github.io/three.rust/progress.html
- https://postmelee.github.io/three.rust/history.html
- https://postmelee.github.io/three.rust/history.json

This status-site deployment is separate from the portable engine demo and npm
publication. Its history records implementation claims, not benchmark speedups.

## Roadmap synchronization

`docs/roadmap.json` is the versioned milestone/task specification. The
`roadmap synchronization` workflow uses a job with `issues:write` to create
missing milestones and associate **existing, explicitly marked issues**. It
never closes issues, overwrites bodies or infers implementation completion.
It runs on relevant pushes to main or trusted manual dispatch. The temporary
adoption-branch trigger has been removed for integration.
Tests cover idempotency and refusal to adopt unrelated issues. The workflow
uploads its verified associations. Issue/PR completion remains governed by
Hyper-Waterfall and task requester approval; milestone progress is not a
percentage of the Three.js codebase translated.

