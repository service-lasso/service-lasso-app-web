# Minimal POC

This document defines the most minimal useful POC for `service-lasso-app-web`.

It must use:
- `service-lasso` as the runtime/API
- `lasso-echoservice` as the first managed service under test
- `lasso-@serviceadmin` as the operator UI

## POC goal

Prove that a browser-facing host app can present the Service Admin UI against a real local runtime/API and a real managed sample service.

## Minimal shape

The POC should:
- start or connect to a local `service-lasso` runtime
- point that runtime at a `servicesRoot` containing Echo Service
- show a host-owned landing or shell view first
- point the browser app at the runtime API
- surface `lasso-@serviceadmin` inside the web app host
- show Echo Service in the admin UI and allow at least:
  - services list
  - service detail
  - logs
  - lifecycle actions

## Required ingredients

1. Runtime:
   - local `service-lasso`
   - explicit `servicesRoot`
   - explicit `workspaceRoot`

2. Service under test:
   - released or local `lasso-echoservice`
   - visible through the runtime as a managed service

3. UI:
   - `lasso-@serviceadmin`
   - configured with `VITE_SERVICE_LASSO_API_BASE_URL` or equivalent host wiring

## Minimal user flow

1. Start the runtime host for the web app.
2. Open the browser app.
3. See host-owned output from the web shell before or alongside the admin surface.
4. See the embedded or proxied Service Admin UI.
5. See Echo Service listed in services.
6. Open Echo Service detail.
7. Start/stop Echo Service from the UI.
8. View logs and health for Echo Service.

## POC deliverables

- a local start command for the web host
- documented runtime/API wiring
- documented Echo Service dependency/setup
- documented Service Admin embedding/proxy strategy
- documented host-owned output or shell framing
- one short smoke checklist proving the flow works

## Honest scope limit

This POC does not need:
- auth
- production hosting
- multi-service dashboards beyond Echo Service
- packaging/installer work

It only needs to prove:

**a web host can present Service Admin against a real Service Lasso runtime managing Echo Service**
