import fs from "node:fs";
import { basename, join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import type { Collection } from "@iiif/presentation-3";
import { parse } from "yaml";
import type { IIIFJSONStore } from "../stores/iiif-json.ts";
import type { IIIFRemoteStore } from "../stores/iiif-remote.ts";
import type { NetworkConfig } from "./network.ts";
import type { SlugConfig } from "./slug-engine.ts";

export interface BuildConcurrencyConfig {
  cpu?: number;
  io?: number;
  link?: number;
  extract?: number;
  enrich?: number;
  enrichCanvas?: number;
  emit?: number;
  emitCanvas?: number;
  write?: number;
}

export interface IIIFRC {
  server?: {
    url: string;
  };
  run?: string[];
  generators?: Record<string, GeneratorConfig>;
  stores: Record<string, IIIFRemoteStore | IIIFJSONStore>;
  slugs?: Record<string, SlugConfig>;
  config?: Record<string, any>;
  collections?: {
    index?: Partial<Collection>;
    manifests?: Partial<Collection>;
    collections?: Record<string, Partial<Collection>>;
    topics?: Record<string, Partial<Collection>>;
  };
  search?: {
    indexNames?: string[];
    defaultIndex?: string;
    emitRecord?: boolean;
  };
  network?: NetworkConfig;
  concurrency?: BuildConcurrencyConfig;
  fileTemplates?: Record<string, any>;
}

export interface GenericStore {
  path: string;
  type: "iiif-json" | "iiif-remote";
  pattern?: string;
  options?: Record<string, any>;
  metadata?: {
    label: string;
    description?: string;
  };
  slugTemplate?: SlugConfig | SlugConfig[];
  slugTemplates?: string[];
  // Step options
  skip?: string[];
  run?: string[];
  config?: Record<string, any>;
  subFiles?: boolean;
  destination?: string;
  ignore?: string[];
  network?: NetworkConfig;
}

interface GeneratorConfig {
  type: string;
  output?: string;
  config?: Record<string, any>;
}

export const DEFAULT_CONFIG: IIIFRC = {
  stores: {
    default: {
      path: "content",
      type: "iiif-json",
      pattern: "**/*.json",
      subFiles: true,
    },
  },
};

export type ConfigMode = "explicit" | "file" | "folder" | "default" | "custom";

export interface ConfigWatchPath {
  path: string;
  recursive: boolean;
}

export interface ResolvedConfigSource {
  mode: ConfigMode;
  config: IIIFRC;
  configPath?: string;
  defaultScriptsPath: string;
  watchPaths: ConfigWatchPath[];
}

export const supportedConfigFiles = [".iiifrc.yml", ".iiifrc.yaml", "iiif.config.js", "iiif.config.ts"];

function normalizeConfigExport(value: unknown) {
  if (!value) {
    return {} as IIIFRC;
  }

  if (typeof value === "object" && value !== null && "default" in value) {
    // ESM files often export config as default.
    return (value as Record<string, any>).default || {};
  }

  return value as IIIFRC;
}

function assertStoreValue(storeName: string, rawStore: any, sourcePath: string) {
  if (!rawStore || typeof rawStore !== "object") {
    throw new Error(`Store "${storeName}" from "${sourcePath}" must be a JSON object`);
  }

  if (!rawStore.type) {
    throw new Error(`Store "${storeName}" from "${sourcePath}" is missing required "type"`);
  }
}

async function loadConfigFile(configFilePath: string): Promise<IIIFRC> {
  if (configFilePath.endsWith(".yaml") || configFilePath.endsWith(".yml")) {
    const configFileContent = await fs.promises.readFile(configFilePath, "utf8");
    const parsedConfig = parse(configFileContent);
    return (parsedConfig || {}) as IIIFRC;
  }

  // Add a timestamp query to avoid stale module cache in long-running watch processes.
  const configUrl = pathToFileURL(configFilePath).href;
  const loaded = await import(`${configUrl}?t=${Date.now()}`);
  return normalizeConfigExport(loaded) as IIIFRC;
}

async function loadJsonFile(jsonPath: string) {
  const content = await fs.promises.readFile(jsonPath, "utf8");
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Invalid JSON in "${jsonPath}": ${(error as Error).message}`);
  }
}

async function loadStoreSidecarConfigs(storeDirectory: string) {
  const sidecarConfig: Record<string, any> = {};
  const sidecarPaths: string[] = [];
  const storeFiles = await fs.promises.readdir(storeDirectory, { withFileTypes: true });

  for (const storeFile of storeFiles) {
    if (!storeFile.isFile() || !storeFile.name.endsWith(".json") || storeFile.name === "_store.json") {
      continue;
    }

    const sidecarPath = join(storeDirectory, storeFile.name);
    const sidecarName = basename(storeFile.name, ".json");
    sidecarConfig[sidecarName] = await loadJsonFile(sidecarPath);
    sidecarPaths.push(sidecarPath);
  }

  return { sidecarConfig, sidecarPaths };
}

function normalizeConfig(inputConfig: IIIFRC | null | undefined) {
  const config = (inputConfig || {}) as IIIFRC;

  if (!config.stores) {
    config.stores = {};
  }

  return config;
}

function applyDefaultStores(inputConfig: IIIFRC) {
  const config = normalizeConfig(inputConfig);
  if (!config.stores || Object.keys(config.stores).length === 0) {
    config.stores = { ...DEFAULT_CONFIG.stores };
  }
  return config;
}

async function loadIiifConfigFolder(projectRoot: string): Promise<ResolvedConfigSource | null> {
  const iiifConfigRoot = join(projectRoot, "iiif-config");
  if (!fs.existsSync(iiifConfigRoot)) {
    return null;
  }

  const configYml = join(iiifConfigRoot, "config.yml");
  const configYaml = join(iiifConfigRoot, "config.yaml");
  const storesDir = join(iiifConfigRoot, "stores");
  const configDir = join(iiifConfigRoot, "config");
  const scriptsDir = join(iiifConfigRoot, "scripts");

  let rootConfig = {} as IIIFRC;
  let globalConfigPath: string | undefined;

  if (fs.existsSync(configYml)) {
    rootConfig = normalizeConfig(await loadConfigFile(configYml));
    globalConfigPath = configYml;
  } else if (fs.existsSync(configYaml)) {
    rootConfig = normalizeConfig(await loadConfigFile(configYaml));
    globalConfigPath = configYaml;
  }

  const discoveredStores: Record<string, IIIFRemoteStore | IIIFJSONStore> = {};
  const storeDeclarationPaths: string[] = [];

  if (fs.existsSync(storesDir)) {
    const storeEntries = await fs.promises.readdir(storesDir, { withFileTypes: true });
    for (const storeEntry of storeEntries) {
      if (storeEntry.isFile() && storeEntry.name.endsWith(".json")) {
        const storeName = basename(storeEntry.name, ".json");
        const storePath = join(storesDir, storeEntry.name);

        if (discoveredStores[storeName] || rootConfig.stores?.[storeName]) {
          throw new Error(`Duplicate store "${storeName}" found in "${storePath}"`);
        }

        const rawStore = await loadJsonFile(storePath);
        assertStoreValue(storeName, rawStore, storePath);

        if (rawStore.type === "iiif-json" && !rawStore.path) {
          throw new Error(`Store "${storeName}" in "${storePath}" must include "path" when using type "iiif-json"`);
        }

        discoveredStores[storeName] = rawStore;
        storeDeclarationPaths.push(storePath);
      }

      if (storeEntry.isDirectory()) {
        const storeName = storeEntry.name;
        const storeDirectory = join(storesDir, storeName);
        const storePath = join(storeDirectory, "_store.json");
        if (!fs.existsSync(storePath)) {
          continue;
        }

        if (discoveredStores[storeName] || rootConfig.stores?.[storeName]) {
          throw new Error(`Duplicate store "${storeName}" found in "${storePath}"`);
        }

        const rawStore = await loadJsonFile(storePath);
        assertStoreValue(storeName, rawStore, storePath);
        const { sidecarConfig, sidecarPaths } = await loadStoreSidecarConfigs(storeDirectory);

        if (rawStore.type === "iiif-json" && !rawStore.path) {
          const defaultPath = join(storesDir, storeName, "manifests");
          rawStore.path = defaultPath;
          rawStore.base = rawStore.base || defaultPath;
        }

        if (Object.keys(sidecarConfig).length > 0) {
          rawStore.config = {
            ...sidecarConfig,
            ...(rawStore.config || {}),
          };
          storeDeclarationPaths.push(...sidecarPaths);
        }

        discoveredStores[storeName] = rawStore;
        storeDeclarationPaths.push(storePath);
      }
    }
  }

  const mergedConfig = normalizeConfig(rootConfig);
  mergedConfig.stores = {
    ...(rootConfig.stores || {}),
    ...discoveredStores,
  };

  if (fs.existsSync(configDir)) {
    const configEntries = await fs.promises.readdir(configDir, { withFileTypes: true });
    for (const configEntry of configEntries) {
      if (!configEntry.isFile() || !configEntry.name.endsWith(".json")) {
        continue;
      }

      const configFilePath = join(configDir, configEntry.name);
      const configName = basename(configEntry.name, ".json");
      const configValue = await loadJsonFile(configFilePath);

      mergedConfig.config = mergedConfig.config || {};
      mergedConfig.config[configName] = configValue;
    }
  }

  const watchPaths: ConfigWatchPath[] = [];
  if (globalConfigPath && fs.existsSync(globalConfigPath)) {
    watchPaths.push({ path: globalConfigPath, recursive: false });
  }
  if (fs.existsSync(configDir)) {
    watchPaths.push({ path: configDir, recursive: true });
  }
  if (fs.existsSync(scriptsDir)) {
    watchPaths.push({ path: scriptsDir, recursive: true });
  }
  if (fs.existsSync(storesDir)) {
    // Non-recursive lets us detect new store declarations without rebuilding on every manifest edit.
    watchPaths.push({ path: storesDir, recursive: false });
  }
  for (const storePath of storeDeclarationPaths) {
    watchPaths.push({ path: storePath, recursive: false });
  }

  return {
    mode: "folder",
    config: applyDefaultStores(mergedConfig),
    defaultScriptsPath: "./iiif-config/scripts",
    watchPaths,
  };
}

export async function resolveConfigSource(configFile?: string): Promise<ResolvedConfigSource> {
  const projectRoot = cwd();

  if (configFile) {
    const configFilePath = join(projectRoot, configFile);
    return {
      mode: "explicit",
      config: applyDefaultStores(await loadConfigFile(configFilePath)),
      configPath: configFilePath,
      defaultScriptsPath: "./scripts",
      watchPaths: [{ path: configFilePath, recursive: false }],
    };
  }

  for (const configFileName of supportedConfigFiles) {
    const configFilePath = join(projectRoot, configFileName);
    if (fs.existsSync(configFilePath)) {
      return {
        mode: "file",
        config: applyDefaultStores(await loadConfigFile(configFilePath)),
        configPath: configFilePath,
        defaultScriptsPath: "./scripts",
        watchPaths: [{ path: configFilePath, recursive: false }],
      };
    }
  }

  const folderConfig = await loadIiifConfigFolder(projectRoot);
  if (folderConfig) {
    return folderConfig;
  }

  return {
    mode: "default",
    config: { ...DEFAULT_CONFIG },
    defaultScriptsPath: "./scripts",
    watchPaths: [],
  };
}

export async function getConfig(configFile?: string) {
  const resolvedSource = await resolveConfigSource(configFile);
  return applyDefaultStores(resolvedSource.config) as IIIFRC;
}

export function getCustomConfigSource(config: IIIFRC): ResolvedConfigSource {
  return {
    mode: "custom",
    config: applyDefaultStores(config),
    defaultScriptsPath: "./scripts",
    watchPaths: [],
  };
}
