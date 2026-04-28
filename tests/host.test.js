import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createServer } from "node:http";
import { resolveWebConfig, validateWebConfig } from "../src/config.js";
import { createHostStatus, createWebHostServer } from "../src/server.js";

async function createFixtureRoots() {
  const root = await mkdtemp(path.join(tmpdir(), "service-lasso-app-web-"));
  const siblingRoot = path.join(root, "siblings");
  const adminDistRoot = path.join(siblingRoot, "lasso-@serviceadmin", "dist");
  const sourceServicesRoot = path.join(root, "service-lasso-app-web", "services");

  await mkdir(adminDistRoot, { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "echo-service"), { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "@serviceadmin"), { recursive: true });
  await writeFile(path.join(adminDistRoot, "index.html"), "<!doctype html><title>admin</title>", "utf8");
  await writeFile(path.join(adminDistRoot, "asset.js"), "console.log('admin asset');", "utf8");
  await writeFile(
    path.join(sourceServicesRoot, "echo-service", "service.json"),
    "{\n  \"id\": \"echo-service\",\n  \"artifact\": {\n    \"kind\": \"archive\"\n  }\n}\n",
    "utf8",
  );
  await writeFile(path.join(sourceServicesRoot, "@serviceadmin", "service.json"), "{\n  \"id\": \"@serviceadmin\"\n}\n", "utf8");

  return {
    root,
    siblingRoot,
    adminDistRoot,
    sourceServicesRoot,
  };
}

async function startRuntimeFixture(payload, statusCode = 200) {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/api/services") {
      response.statusCode = statusCode;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(payload));
      return;
    }

    response.statusCode = 404;
    response.end("not found");
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      server.close();
      await once(server, "close");
    },
  };
}

test("web config resolves deterministic sibling repo paths", async () => {
  const fixture = await createFixtureRoots();

  try {
    const config = resolveWebConfig({
      repoRoot: path.join(fixture.root, "service-lasso-app-web"),
      siblingRoot: fixture.siblingRoot,
      hostPort: 19120,
      runtimePort: 18192,
    });

    assert.equal(config.hostUrl, "http://127.0.0.1:19120");
    assert.equal(config.runtimeUrl, "http://127.0.0.1:18192");
    assert.equal(config.adminDistRoot, fixture.adminDistRoot);
    assert.equal(config.sourceServicesRoot, fixture.sourceServicesRoot);

    await assert.doesNotReject(() => validateWebConfig(config));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("web host serves shell, host status, and mounted admin assets", async () => {
  const fixture = await createFixtureRoots();

  try {
    const config = await validateWebConfig(
      resolveWebConfig({
        repoRoot: path.join(fixture.root, "service-lasso-app-web"),
        siblingRoot: fixture.siblingRoot,
        hostPort: 0,
        runtimePort: 18192,
      }),
    );
    const status = createHostStatus(config);
    assert.equal(status.app, "@service-lasso/service-lasso-app-web");
    assert.equal(status.sourceServicesRoot, fixture.sourceServicesRoot);

    const server = createWebHostServer(config);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const shellResponse = await fetch(`${baseUrl}/`);
      assert.equal(shellResponse.status, 200);
      const shellHtml = await shellResponse.text();
      assert.match(shellHtml, /Browser-first shell for Service Lasso/);
      assert.match(shellHtml, /Host-owned service widget/);
      assert.match(shellHtml, /\/api\/runtime-services/);
      assert.match(shellHtml, /<iframe title="Service Admin" src="\/admin\/"><\/iframe>/);

      const statusResponse = await fetch(`${baseUrl}/api/host-status`);
      assert.equal(statusResponse.status, 200);
      const statusBody = await statusResponse.json();
      assert.equal(statusBody.runtimeUrl, config.runtimeUrl);
      assert.equal(statusBody.adminDistRoot, fixture.adminDistRoot);
      assert.equal(statusBody.sourceServicesRoot, fixture.sourceServicesRoot);

      const assetResponse = await fetch(`${baseUrl}/admin/asset.js`);
      assert.equal(assetResponse.status, 200);
      assert.match(await assetResponse.text(), /admin asset/);

      const spaResponse = await fetch(`${baseUrl}/admin/missing/route`);
      assert.equal(spaResponse.status, 200);
      assert.match(await spaResponse.text(), /<title>admin<\/title>/);
    } finally {
      server.close();
      await once(server, "close");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("web host proxies runtime services for the host-owned widget", async () => {
  const fixture = await createFixtureRoots();
  const runtime = await startRuntimeFixture({
    services: [
      {
        id: "echo-service",
        name: "Echo Service",
        lifecycle: { installed: true, configured: true, running: false },
        health: { type: "process", healthy: true, detail: "Process is ready." },
      },
    ],
  });

  try {
    const config = await validateWebConfig(
      resolveWebConfig({
        repoRoot: path.join(fixture.root, "service-lasso-app-web"),
        siblingRoot: fixture.siblingRoot,
        hostPort: 0,
        runtimePort: Number(new URL(runtime.url).port),
      }),
    );
    const server = createWebHostServer(config);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const servicesResponse = await fetch(`${baseUrl}/api/runtime-services`);
      assert.equal(servicesResponse.status, 200);
      const servicesBody = await servicesResponse.json();
      assert.equal(servicesBody.services.length, 1);
      assert.equal(servicesBody.services[0].id, "echo-service");
      assert.equal(servicesBody.services[0].health.healthy, true);
    } finally {
      server.close();
      await once(server, "close");
    }
  } finally {
    await runtime.close();
    await rm(fixture.root, { recursive: true, force: true });
  }
});
