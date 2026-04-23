# App Web task list

This document tracks the first real implementation slice for `service-lasso-app-web`.

## Goal

Turn the starter into the smallest real browser-first host that:
- uses published `@service-lasso/service-lasso`
- shows host-owned web output
- embeds `lasso-@serviceadmin`
- discovers real `lasso-echoservice`

## Bounded tasks

1. Add package-registry wiring for `@service-lasso/service-lasso`
   status: done

2. Define deterministic local runtime/host ports and sibling-repo path assumptions
   status: done

3. Replace the placeholder entrypoint with a real web host bootstrap
   status: done

4. Serve a host-owned web shell with embedded admin UI and runtime links
   status: done

5. Mount the built Service Admin app from the sibling repo
   status: done

6. Prepare a local `servicesRoot` from the tracked service inventory
   status: done

7. Add direct tests for config resolution, host routes, and wrapper materialization
   status: done

8. Prove local start behavior against the current workspace
   status: done

## Honest current scope

This slice does not yet build a production SPA framework host or deployment setup.

It only proves:

**a browser-first host can boot the published runtime, embed Service Admin, and surface Echo Service through a local web shell**

## Current evidence

- `npm test`
- `npm run release:verify`
- local smoke:
  - web shell on `http://127.0.0.1:19120`
  - runtime API on `http://127.0.0.1:18081`
  - embedded admin UI on `/admin/`
  - discovered service id: `echo-service`
  - install/config/start/stop exercised against the real sibling `lasso-echoservice`
