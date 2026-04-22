import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { resolveWebConfig, validateWebConfig } from "../src/config.js";
import { createHostStatus, createWebHostServer } from "../src/server.js";

async function createFixtureRoots() {
  const root = await mkdtemp(path.join(tmpdir(), "service-lasso-app-web-"));
  const siblingRoot = path.join(root, "siblings");
  const adminDistRoot = path.join(siblingRoot, "lasso-@serviceadmin", "dist");
  const echoServiceRepoRoot = path.join(siblingRoot, "lasso-echoservice");
  const sourceServicesRoot = path.join(root, "service-lasso-app-web", "services");

  await mkdir(adminDistRoot, { recursive: true });
  await mkdir(echoServiceRepoRoot, { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "echo-service"), { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "service-admin"), { recursive: true });
  await writeFile(path.join(adminDistRoot, "index.html"), "<!doctype html><title>admin</title>", "utf8");
  await writeFile(path.join(adminDistRoot, "asset.js"), "console.log('admin asset');", "utf8");
  await writeFile(path.join(echoServiceRepoRoot, "service.json"), "{\n  \"id\": \"echo-service\"\n}\n", "utf8");
  await writeFile(path.join(sourceServicesRoot, "echo-service", "service.json"), "{\n  \"id\": \"echo-service\"\n}\n", "utf8");
  await writeFile(path.join(sourceServicesRoot, "service-admin", "service.json"), "{\n  \"id\": \"service-admin\"\n}\n", "utf8");

  return {
    root,
    siblingRoot,
    adminDistRoot,
    echoServiceRepoRoot,
    sourceServicesRoot,
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
    assert.equal(config.echoServiceRepoRoot, fixture.echoServiceRepoRoot);

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
    assert.equal(status.echoServiceRepoRoot, fixture.echoServiceRepoRoot);

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
