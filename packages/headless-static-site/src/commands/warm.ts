import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { getBuildConfig } from "../util/get-build-config.ts";
import { warmRemoteStores } from "./build-steps/-1-warm-remote.ts";
import { defaultBuiltIns } from "./build.ts";

interface WarmOptions {
  cwd?: string;
  config?: string;
  cache?: boolean;
  debug?: boolean;
  stores?: string[];
  scripts?: string;
}

export async function warmCommand(options: WarmOptions) {
  const buildConfig = await getBuildConfig(
    {
      generate: false,
      extract: false,
      enrich: false,
      emit: false,
      remoteRecords: false,
      prefetch: true,
      cache: true,
      ui: false,
      ...options,
    },
    defaultBuiltIns
  );

  await fs.promises.mkdir(buildConfig.cacheDir, { recursive: true });
  await fs.promises.mkdir(buildConfig.requestCacheDir, { recursive: true });

  const stats = await warmRemoteStores(buildConfig, { storeRequestCaches: {} });
  const outputRoot = options.cwd || cwd();

  if (stats.stores === 0) {
    console.log("No iiif-remote stores found to warm.");
    return;
  }

  console.log(
    `Warmed ${stats.urls} URL${stats.urls === 1 ? "" : "s"} across ${stats.stores} remote store${
      stats.stores === 1 ? "" : "s"
    }.`
  );
  console.log(`Request cache path: ${join(outputRoot, buildConfig.requestCacheDir)}`);
  if (stats.failures > 0) {
    console.log(`Completed with ${stats.failures} failed URL${stats.failures === 1 ? "" : "s"}.`);
  }
}
