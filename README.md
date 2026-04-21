# service-lasso-app-web

Template repo for a web-hosted Service Lasso app.

Package identity:
- `@service-lasso/service-lasso-app-web`

Purpose:
- show how a browser-facing app should consume the Service Lasso runtime/API
- act as a quick-start template for downstream teams
- keep UI concerns out of the core `service-lasso` repo

Expected runtime model:
- `servicesRoot`
- `workspaceRoot`

Current scaffold:
- minimal starter package metadata
- placeholder app entry under `src/`
- ready to be expanded into a real template repo

## Current release artifact

This starter repo now has a bounded template-source release artifact.

Current local commands:
- `npm test`
- `npm run release:artifact`
- `npm run release:verify`

Current pipelines:
- `CI`
  - runs on pushes to `main` and on pull requests
  - installs dependencies and runs `npm test`
- `Release`
  - runs on version tags like `v0.1.0` or by manual dispatch
  - runs tests, verifies the artifact, uploads the packaged files, and creates or updates the tagged GitHub release

Current shipped artifact contents are documented in:
- `docs/release-artifact.md`

Current honest label:
- this repo ships a starter-template source bundle, not a built production web app
