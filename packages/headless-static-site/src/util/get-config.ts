import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type { Collection } from "@iiif/presentation-3";
import { parse } from "yaml";
import type { IIIFJSONStore } from "../stores/iiif-json.ts";
import type { IIIFRemoteStore } from "../stores/iiif-remote.ts";
import type { SlugConfig } from "./slug-engine.ts";

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
  slugTemplates?: string[];
  // Step options
  skip?: string[];
  run?: string[];
  config?: Record<string, any>;
  subFiles?: boolean;
  destination?: string;
  ignore?: string[];
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

let config: IIIFRC | null = null;

export const supportedConfigFiles = [".iiifrc.yml", ".iiifrc.yaml", "iiif.config.js", "iiif.config.ts"];

export async function getConfig(configFile?: string) {
  if (configFile) {
    const configFilePath = join(cwd(), configFile);
    if (configFilePath.endsWith(".yaml") || configFilePath.endsWith(".yml")) {
      const configFileContent = await fs.promises.readFile(configFilePath, "utf8");
      config = parse(configFileContent);
    } else {
      config = await import(configFilePath);
    }
  }

  if (!config) {
    for (const configFileName of supportedConfigFiles) {
      if (fs.existsSync(join(cwd(), configFileName))) {
        if (configFileName.endsWith(".yaml") || configFileName.endsWith(".yml")) {
          const file = await fs.promises.readFile(join(cwd(), configFileName), "utf8");
          config = parse(file);
          break;
        }

        config = await import(join(cwd(), configFileName));
        break;
      }
    }
  }

  if (!config || !config.stores) {
    config = DEFAULT_CONFIG;
  }

  if (!config.stores) {
    config.stores = DEFAULT_CONFIG.stores;
  }

  return config as IIIFRC;
}
