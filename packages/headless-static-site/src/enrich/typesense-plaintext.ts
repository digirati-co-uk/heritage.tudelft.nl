import { join } from 'path';
import { Enrichment } from '../util/enrich';
import { existsSync } from 'fs';
import { readFile, readdir } from 'fs/promises';

const plaintextSchema = {
  name: 'manifest-plaintext',
  fields: [
    { name: 'id', type: 'string' },
    { name: 'plaintext', type: 'string' },
    { name: 'manifest', type: 'string' },
    { name: 'canvasIndex', type: 'int32' },
  ],
};

type SingleRecord = {
  id: string;
  plaintext: string;
  manifest: string;
  canvasIndex: number;
};

export const typesensePlaintext: Enrichment = {
  id: 'typesense-plaintext',
  name: 'Typesense plaintext',
  types: ['Manifest'],
  async invalidate(resource, api, config) {
    return true;
  },
  async handler(resource, api, config) {
    const plaintextPath = join(api.files, 'plaintext');

    const pages: SingleRecord[] = [];

    if (existsSync(plaintextPath)) {
      const files = await readdir(plaintextPath);

      for (const file of files) {
        if (file.endsWith('.txt')) {
          const fileName = file.replace('.txt', '');
          const canvasIndex = parseInt(fileName);
          if (isNaN(canvasIndex)) {
            continue;
          }

          pages.push({
            id: btoa(resource.id + canvasIndex),
            plaintext: await readFile(join(plaintextPath, file), 'utf-8'),
            manifest: resource.id,
            canvasIndex,
          });
        }
      }
    }

    return {
      temp: { pages },
    };
  },
  async collect(temp, api, config) {
    if (!temp) {
      return;
    }
    const typeSenseDir = join(api.build.filesDir, 'meta', 'typesense');
    const schemaFile = join(typeSenseDir, 'manifest-plaintext.schema.json');
    const dataFile = join(typeSenseDir, 'manifest-plaintext.jsonl');

    await Bun.write(schemaFile, JSON.stringify(plaintextSchema, null, 2));

    const jsonLines = [];
    for (const [manifest, { pages }] of Object.entries(temp)) {
      for (const page of pages) {
        jsonLines.push(JSON.stringify(page));
      }
    }

    await Bun.write(dataFile, jsonLines.join('\n'));
  },
};
