import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import type { Collection } from "@iiif/presentation-3";
import { parse } from "yaml";
import type { SlugConfig } from "./slug-engine.ts";

export interface IIIFRC {
  server?: {
    url: string;
  };
  run?: string[];
  generators?: Record<string, GeneratorConfig>;
  stores: Record<string, GenericStore>;
  slugs?: Record<string, SlugConfig>;
  config?: Record<string, any>;
  collections?: {
    index?: Partial<Collection>;
    manifests?: Partial<Collection>;
    collections?: Record<string, Partial<Collection>>;
    topics?: Record<string, Partial<Collection>>;
  };
}

export interface GenericStore {
  path: string;
  type: string;
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
}

interface GeneratorConfig {
  type: string;
  output?: string;
  config?: Record<string, any>;
}

const DEFAULT_CONFIG: IIIFRC = {
  stores: {
    default: {
      path: "content",
      type: "iiif-json",
      pattern: "**/*.json",
    },
  },
};

let config: IIIFRC | null = null;

export const supportedConfigFiles = [".iiifrc.yml", ".iiifrc.yaml", "iiif.config.js", "iiif.config.ts"];

export async function getConfig() {
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

  return config as IIIFRC;
}
