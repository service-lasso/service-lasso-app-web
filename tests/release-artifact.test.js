import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import {
  createTemporaryOutputRoot,
  readRootPackageJson,
  stageReleaseArtifact,
  verifyStagedArtifact,
} from "../scripts/release-artifact-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("starter release artifact can be staged and verified", async () => {
  const outputRoot = await createTemporaryOutputRoot();

  try {
    const packageJson = await readRootPackageJson(repoRoot);
    const packageSuffix = packageJson.name.split("/").at(-1);
    const staged = await stageReleaseArtifact({
      repoRoot,
      outputRoot,
    });

    assert.match(staged.artifactName, new RegExp(`^${packageSuffix}-\\d+\\.\\d+\\.\\d+$`));
    assert.equal(staged.manifest.artifactKind, "starter-template-source");

    const verified = await verifyStagedArtifact({
      repoRoot,
      artifactRoot: staged.artifactRoot,
      archivePath: staged.archivePath,
    });

    assert.equal(verified.artifactName, staged.artifactName);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("starter release artifact respects SERVICE_LASSO_RELEASE_VERSION when provided", async () => {
  const outputRoot = await createTemporaryOutputRoot();
  const previousVersion = process.env.SERVICE_LASSO_RELEASE_VERSION;
  process.env.SERVICE_LASSO_RELEASE_VERSION = "2026.4.23-abcdef1";

  try {
    const packageJson = await readRootPackageJson(repoRoot);
    const packageSuffix = packageJson.name.split("/").at(-1);
    const staged = await stageReleaseArtifact({
      repoRoot,
      outputRoot,
    });

    assert.equal(staged.artifactName, `${packageSuffix}-2026.4.23-abcdef1`);
  } finally {
    if (previousVersion === undefined) {
      delete process.env.SERVICE_LASSO_RELEASE_VERSION;
    } else {
      process.env.SERVICE_LASSO_RELEASE_VERSION = previousVersion;
    }

    await rm(outputRoot, { recursive: true, force: true });
  }
});
