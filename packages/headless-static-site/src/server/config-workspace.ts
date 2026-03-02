import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { cwd } from "node:process";
import type { ConfigMode } from "../util/get-config.ts";

export interface RebuildStatus {
  triggered: boolean;
  mode: "full";
  ok: boolean;
  error: string | null;
}

export interface IiifConfigWorkspace {
  projectRoot: string;
  configRoot: string;
  configDir: string;
  storesDir: string;
  mode: ConfigMode | "unknown";
  writable: boolean;
  reason?: string;
}

export function createRebuildStatus(): RebuildStatus {
  return {
    triggered: false,
    mode: "full",
    ok: true,
    error: null,
  };
}

export async function maybeRunRebuild(rebuild?: () => Promise<void>): Promise<RebuildStatus> {
  if (!rebuild) {
    return createRebuildStatus();
  }

  const status: RebuildStatus = {
    triggered: true,
    mode: "full",
    ok: true,
    error: null,
  };

  try {
    await rebuild();
  } catch (error) {
    status.ok = false;
    status.error = (error as Error)?.message || String(error);
  }

  return status;
}

export function resolveIiifConfigWorkspace(mode?: ConfigMode | "unknown"): IiifConfigWorkspace {
  const projectRoot = cwd();
  const configRoot = join(projectRoot, "iiif-config");
  const configDir = join(configRoot, "config");
  const storesDir = join(configRoot, "stores");
  const resolvedMode = mode || "unknown";

  if (resolvedMode !== "folder") {
    return {
      projectRoot,
      configRoot,
      configDir,
      storesDir,
      mode: resolvedMode,
      writable: false,
      reason: "Debug config editing is only available in iiif-config folder mode.",
    };
  }

  if (!existsSync(configRoot)) {
    return {
      projectRoot,
      configRoot,
      configDir,
      storesDir,
      mode: resolvedMode,
      writable: false,
      reason: "iiif-config folder was not found in the current project.",
    };
  }

  return {
    projectRoot,
    configRoot,
    configDir,
    storesDir,
    mode: resolvedMode,
    writable: true,
  };
}

export async function readJsonObject(filePath: string) {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = await readFile(filePath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Expected JSON object");
    }
    return parsed as Record<string, any>;
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${(error as Error).message}`);
  }
}

export async function writeJsonObject(filePath: string, value: Record<string, any>) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

export function assertStoreId(storeId: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(storeId)) {
    throw new Error("Store id must match /^[A-Za-z0-9_-]+$/");
  }
}
