import fs from "node:fs";
import { join } from "node:path";
import { cwd } from "node:process";
import { IIIFBuilder } from "@iiif/builder";
import type { Command } from "commander";
import { nasaGenerator } from "../generator/nasa-generator.ts";
import { getConfig } from "../util/get-config.ts";
import { getNodeGlobals } from "../util/get-node-globals.ts";
import type { IIIFGenerator } from "../util/iiif-generator.ts";
import { type LazyValue, lazyValue } from "../util/lazy-value.ts";
import { loadJson } from "../util/load-json.ts";
import { loadScripts } from "../util/load-scripts.ts";
import { makeProgressBar } from "../util/make-progress-bar.ts";
import { createStoreRequestCache } from "../util/store-request-cache.ts";

interface GenerateOptions {
  scripts?: string;
  debug?: boolean;
  cache?: boolean;
  ui?: boolean;
}

const defaultGenerators: IIIFGenerator[] = [
  //
  nasaGenerator,
];

export const defaultCacheDir = "./.iiif/_generator";

export async function generateCommand(options: GenerateOptions, command?: Command) {
  const config = await getConfig();
  const { debug, ui } = options;

  await loadScripts(options);
  const globals = getNodeGlobals();
  const generatorDirectory = join(cwd(), defaultCacheDir);
  const allGenerators = [...defaultGenerators, ...globals.generators];

  await fs.promises.mkdir(generatorDirectory, { recursive: true });
  let savingFiles: Promise<any>[] = [];
  const saveJson = (file: string, contents: any) => {
    savingFiles.push(fs.promises.writeFile(file, JSON.stringify(contents, null, 2)));
  };
  const waitSavingFiles = async () => {
    await Promise.all(savingFiles);
    savingFiles = [];
  };

  let totalResources = 0;

  if (config.generators) {
    const generators = Object.keys(config.generators);
    for (const generatorName of generators) {
      const generator = config.generators[generatorName];
      const generatorType = generator.type;
      const generatorConfig = generator.config || {};

      const foundGenerator = allGenerators.find((g) => g.id === generatorType);

      if (!foundGenerator) {
        throw new Error(`Unknown generator type: ${generatorType}`);
      }

      const buildDirectory = generator.output
        ? join(cwd(), generator.output)
        : join(generatorDirectory, generatorName, "build");
      const cacheDirectory = join(generatorDirectory, generatorName);
      const resourcesDirectory = join(cacheDirectory, "resources");
      const requestCache = createStoreRequestCache("requests", cacheDirectory, !options.cache);

      await fs.promises.mkdir(cacheDirectory, { recursive: true });
      await fs.promises.mkdir(buildDirectory, { recursive: true });

      const globalCacheFile = join(cacheDirectory, "cache.json");
      const globalCache = lazyValue(() => loadJson(globalCacheFile));
      const generatorApi = {
        config: generatorConfig,
        caches: globalCache,
        cacheDirectory,
        saveJson: (file: string, contents: any) => saveJson(join(buildDirectory, file), contents),
        builder: new IIIFBuilder(),
        requestCache,
      };
      const resources = await foundGenerator.prepare(generatorApi);
      const resourceCaches: Record<string, LazyValue<any>> = {};
      const invalidateMap: Record<string, boolean> = {};

      const progress = makeProgressBar(
        `Generating ${generator.type} using ${foundGenerator.name}`,
        resources.length,
        options.ui
      );

      totalResources += resources.length;

      let globalInvalidate = false;
      // First check if we need to invalidate everything
      const invalidate = foundGenerator.invalidate
        ? await foundGenerator.invalidate(resources, generatorApi)
        : !fs.existsSync(globalCacheFile);

      globalInvalidate = globalInvalidate || invalidate;

      if (!invalidate) {
        for (const resource of resources) {
          if (!resource.id) {
            throw new Error(`Resource ${resource.type} has no id`);
          }
          const resourceCacheFile = join(resourcesDirectory, resource.id, "cache.json");
          resourceCaches[resource.id] = lazyValue(() => loadJson(resourceCacheFile));

          invalidateMap[resource.id] = foundGenerator.invalidateEach
            ? await foundGenerator.invalidateEach(resource, generatorApi)
            : fs.existsSync(resourceCacheFile);

          globalInvalidate = globalInvalidate || invalidateMap[resource.id];
        }
      }

      for (const resource of resources) {
        const shouldRun = invalidate || invalidateMap[resource.id];
        if (!shouldRun) {
          progress.increment();
          continue;
        }

        const resourceCache = resourceCaches[resource.id];
        const resourceDirectory = join(resourcesDirectory, resource.id);
        const generateApi = {
          config: generatorConfig,
          caches: resourceCache,
          cacheDirectory: resourceDirectory,
          saveJson: (file: string, contents: any) => saveJson(join(buildDirectory, file), contents),
          builder: new IIIFBuilder(),
          requestCache,
        };

        await fs.promises.mkdir(resourceDirectory, { recursive: true });

        const response = foundGenerator.generateEach
          ? await foundGenerator.generateEach(resource, buildDirectory, generateApi)
          : { cache: {} };

        const cache = response.cache || {};

        progress.increment();
        saveJson(join(resourceDirectory, "cache.json"), cache);
      }
      await waitSavingFiles();

      if (foundGenerator.generate && globalInvalidate) {
        const response = await foundGenerator.generate(resources, cacheDirectory, generatorApi);

        const cache = response.cache || {};

        // @todo - do something with the store?
        const store = response.store || {};

        saveJson(join(cacheDirectory, "cache.json"), cache);
      }
      await waitSavingFiles();

      if (foundGenerator.postGenerate) {
        await foundGenerator.postGenerate(resources, cacheDirectory, generatorApi);
      }

      await waitSavingFiles();
      progress.stop();
    }
    if (debug) {
      console.log(`Generated ${totalResources} resources`);
    }
  }
}
