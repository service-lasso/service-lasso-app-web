# service-lasso-app-web

Template repo for a web-hosted Service Lasso app.

Package identity:
- `@service-lasso/service-lasso-app-web`

Purpose:
- show how a browser-facing app should consume and host the Service Lasso runtime/API
- act as a quick-start template for downstream teams
- keep UI concerns out of the core `service-lasso` repo

Expected runtime model:
- `servicesRoot`
- `workspaceRoot`

Current implementation:
- browser-first host entrypoint under `src/index.js`
- published `@service-lasso/service-lasso` runtime package consumption
- host-owned landing shell at `/`
- embedded sibling `lasso-@serviceadmin` build at `/admin/`
- prepared local `servicesRoot` wrapper for sibling `lasso-echoservice`

Current local start command:
- `npm start`

Current local URLs:
- web shell: `http://127.0.0.1:19120`
- embedded admin UI: `http://127.0.0.1:19120/admin/`
- runtime API: `http://127.0.0.1:18081`

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
  - runs on pushes to `main`, version tags, or by manual dispatch
  - runs tests, verifies the artifact, uploads the packaged files, and creates or updates the rolling `latest` release on `main`

Current shipped artifact contents are documented in:
- `docs/release-artifact.md`

Current honest label:
- this repo ships a runnable browser-first host starter plus a starter-template source bundle

## Minimal POC

The first concrete target for this repo is documented in:
- `docs/minimal-poc.md`
