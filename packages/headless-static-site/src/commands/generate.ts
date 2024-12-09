import { getConfig } from '../util/get-config.ts';
import { loadScripts } from '../util/load-scripts.ts';
import { getNodeGlobals } from '../util/get-node-globals.ts';
import { Command } from 'commander';
import { IIIFGenerator } from '../util/iiif-generator.ts';
import { nasaGenerator } from '../generator/nasa-generator.ts';
import { join } from 'node:path';
import { mkdirp } from 'mkdirp';
import { loadJson } from '../util/load-json.ts';
import { existsSync } from 'fs';
import { lazyValue, LazyValue } from '../util/lazy-value.ts';
import { IIIFBuilder } from '@iiif/builder';
import { makeProgressBar } from '../util/make-progress-bar.ts';
import { cwd } from 'node:process';
import { createStoreRequestCache } from '../util/store-request-cache.ts';

interface GenerateOptions {
  scripts?: string;
  debug?: boolean;
  cache?: boolean;
}

const defaultGenerators: IIIFGenerator[] = [
  //
  nasaGenerator,
];

export const defaultCacheDir = `./.iiif/_generator`;

export async function generate(options: GenerateOptions, command?: Command) {
  const config = await getConfig();

  await loadScripts(options);
  const globals = getNodeGlobals();
  const generatorDirectory = join(cwd(), defaultCacheDir);
  const allGenerators = [...defaultGenerators, ...globals.generators];

  await mkdirp(generatorDirectory);
  let savingFiles: Promise<any>[] = [];
  const saveJson = (file: string, contents: any) => {
    savingFiles.push(Bun.write(file, JSON.stringify(contents, null, 2)));
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
        : join(generatorDirectory, generatorName, 'build');
      const cacheDirectory = join(generatorDirectory, generatorName);
      const resourcesDirectory = join(cacheDirectory, 'resources');
      const requestCache = createStoreRequestCache(`requests`, cacheDirectory, !options.cache);

      await mkdirp(cacheDirectory);
      await mkdirp(buildDirectory);

      const globalCacheFile = join(cacheDirectory, 'cache.json');
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

      const progress = makeProgressBar(`Generating ${generator.type} using ${foundGenerator.name}`, resources.length);

      totalResources += resources.length;

      let globalInvalidate = false;
      // First check if we need to invalidate everything
      let invalidate = foundGenerator.invalidate
        ? await foundGenerator.invalidate(resources, generatorApi)
        : !existsSync(globalCacheFile);

      globalInvalidate = globalInvalidate || invalidate;

      if (!invalidate) {
        for (const resource of resources) {
          if (!resource.id) {
            throw new Error(`Resource ${resource.type} has no id`);
          }
          const resourceCacheFile = join(resourcesDirectory, resource.id, 'cache.json');
          resourceCaches[resource.id] = lazyValue(() => loadJson(resourceCacheFile));

          invalidateMap[resource.id] = foundGenerator.invalidateEach
            ? await foundGenerator.invalidateEach(resource, generatorApi)
            : existsSync(resourceCacheFile);

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

        await mkdirp(resourceDirectory);

        const response = foundGenerator.generateEach
          ? await foundGenerator.generateEach(resource, buildDirectory, generateApi)
          : { cache: {} };

        const cache = response.cache || {};

        progress.increment();
        saveJson(join(resourceDirectory, 'cache.json'), cache);
      }
      await waitSavingFiles();

      if (foundGenerator.generate && globalInvalidate) {
        const response = await foundGenerator.generate(resources, cacheDirectory, generatorApi);

        const cache = response.cache || {};

        // @todo - do something with the store?
        const store = response.store || {};

        saveJson(join(cacheDirectory, 'cache.json'), cache);
      }
      await waitSavingFiles();

      if (foundGenerator.postGenerate) {
        await foundGenerator.postGenerate(resources, cacheDirectory, generatorApi);
      }

      await waitSavingFiles();
      progress.stop();
    }

    console.log(`Generated ${totalResources} resources`);
  }
}
