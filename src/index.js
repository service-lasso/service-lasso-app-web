import { startApiServer } from "@service-lasso/service-lasso";
import { once } from "node:events";
import { resolveWebConfig, validateWebConfig } from "./config.js";
import { createWebHostServer } from "./server.js";
import { prepareStarterServicesRoot } from "./services-root.js";

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

async function main() {
  const config = await validateWebConfig(resolveWebConfig());

  console.log(`[app-web] booting Service Lasso runtime on ${config.runtimeUrl}`);
  console.log(`[app-web] servicesRoot=${config.servicesRoot}`);
  console.log(`[app-web] workspaceRoot=${config.workspaceRoot}`);

  const preparedServices = await prepareStarterServicesRoot(config);
  console.log(`[app-web] prepared Echo Service wrapper at ${preparedServices.wrapperManifestPath}`);

  const runtime = await startApiServer({
    port: config.runtimePort,
    servicesRoot: config.servicesRoot,
    workspaceRoot: config.workspaceRoot,
  });

  const hostServer = createWebHostServer(config);
  hostServer.listen(config.hostPort, "127.0.0.1");
  await once(hostServer, "listening");

  console.log(`[app-web] web shell ready at ${config.hostUrl}`);
  console.log(`[app-web] admin UI embedded from ${config.adminUrl}`);
  console.log(`[app-web] runtime API ready at ${runtime.url}`);

  let stopping = false;

  async function shutdown(signal) {
    if (stopping) {
      return;
    }

    stopping = true;
    console.log(`[app-web] shutting down after ${signal}`);

    await closeServer(hostServer);
    await runtime.stop();
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT").finally(() => {
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => {
      process.exit(0);
    });
  });
}

await main();
