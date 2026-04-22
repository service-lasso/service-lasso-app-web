import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function writeJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body, null, 2));
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function createShellHtml(config) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Service Lasso App Web</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f4f1e8;
        --panel: rgba(255, 252, 246, 0.92);
        --ink: #162427;
        --muted: #617073;
        --accent: #cb5f2a;
        --line: rgba(22, 36, 39, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(203,95,42,0.16), transparent 34%),
          radial-gradient(circle at bottom right, rgba(22,36,39,0.08), transparent 28%),
          linear-gradient(180deg, #fbf8f2 0%, var(--bg) 100%);
      }
      main {
        min-height: 100vh;
        display: grid;
        grid-template-columns: minmax(300px, 380px) 1fr;
        gap: 20px;
        padding: 24px;
      }
      .panel,
      .frame {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: 0 18px 50px rgba(22,36,39,0.08);
      }
      .panel {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .eyebrow {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(203,95,42,0.12);
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 2.1rem;
        line-height: 1.05;
      }
      p, li {
        color: var(--muted);
        line-height: 1.5;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      .card {
        padding: 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.55);
      }
      .label {
        display: block;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }
      code {
        display: block;
        overflow-wrap: anywhere;
        padding: 8px 10px;
        border-radius: 10px;
        background: #efe6d8;
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 0.9rem;
        color: #28363a;
      }
      .links {
        display: grid;
        gap: 12px;
      }
      a {
        color: inherit;
        text-decoration: none;
      }
      .link {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.55);
      }
      .link strong {
        display: block;
        margin-bottom: 4px;
      }
      .frame {
        overflow: hidden;
        min-height: calc(100vh - 48px);
      }
      iframe {
        width: 100%;
        height: 100%;
        min-height: calc(100vh - 48px);
        border: 0;
        background: white;
      }
      @media (max-width: 1000px) {
        main {
          grid-template-columns: 1fr;
        }
        .frame,
        iframe {
          min-height: 70vh;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <span class="eyebrow">App Web Host</span>
        <h1>Browser-first shell for Service Lasso</h1>
        <p>
          This starter owns the outer web shell, embeds Service Admin, and points the runtime at a prepared Echo Service wrapper.
        </p>
        <div class="card">
          <span class="label">Runtime API</span>
          <code>${config.runtimeUrl}</code>
        </div>
        <div class="card">
          <span class="label">Prepared servicesRoot</span>
          <code>${config.servicesRoot}</code>
        </div>
        <div class="card">
          <span class="label">Workspace root</span>
          <code>${config.workspaceRoot}</code>
        </div>
        <div class="links">
          <a class="link" href="/api/host-status">
            <strong>Host status JSON</strong>
            <span>Inspect the browser host wiring and runtime roots.</span>
          </a>
          <a class="link" href="${config.runtimeUrl}/api/services">
            <strong>Runtime services API</strong>
            <span>See the discovered runtime services directly.</span>
          </a>
          <a class="link" href="/admin/" target="_blank" rel="noreferrer">
            <strong>Open Service Admin alone</strong>
            <span>Launch the embedded admin surface in its own tab.</span>
          </a>
        </div>
      </section>
      <section class="frame">
        <iframe title="Service Admin" src="/admin/"></iframe>
      </section>
    </main>
  </body>
</html>`;
}

async function serveStaticFile(response, filePath) {
  response.statusCode = 200;
  response.setHeader("content-type", getMimeType(filePath));
  createReadStream(filePath).pipe(response);
}

async function resolveStaticFile(config, pathname) {
  const trimmed = pathname.replace(/^\/admin\/?/, "");
  const candidate = trimmed.length === 0 ? "index.html" : trimmed;
  const filePath = path.join(config.adminDistRoot, candidate);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      return filePath;
    }
  } catch {}

  return path.join(config.adminDistRoot, "index.html");
}

export function createHostStatus(config) {
  return {
    app: "@service-lasso/service-lasso-app-web",
    hostUrl: config.hostUrl,
    runtimeUrl: config.runtimeUrl,
    adminUrl: config.adminUrl,
    servicesRoot: config.servicesRoot,
    sourceServicesRoot: config.sourceServicesRoot,
    workspaceRoot: config.workspaceRoot,
    echoServiceRepoRoot: config.echoServiceRepoRoot,
    adminDistRoot: config.adminDistRoot,
    notes: [
      "Host-owned web shell is served at /.",
      "Service Admin is mounted from the sibling build under /admin/.",
      "Tracked services/ definitions are copied into the prepared servicesRoot before runtime startup.",
      "A local Echo Service runner is generated into the prepared servicesRoot.",
    ],
  };
}

export function createWebHostServer(config) {
  const shellHtml = createShellHtml(config);
  const statusBody = createHostStatus(config);

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(shellHtml);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/host-status") {
      writeJson(response, 200, statusBody);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/admin")) {
      const filePath = await resolveStaticFile(config, url.pathname);
      await serveStaticFile(response, filePath);
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("not found");
  });
}
