import { existsSync } from 'fs';
import Typesense from 'typesense';

const client = new Typesense.Client({
  nodes: [
    {
      host: 'localhost',
      port: 8108,
      protocol: 'http',
    },
  ],
  apiKey: 'xyz',
  connectionTimeoutSeconds: 2,
});

if (existsSync('./.iiif/build/meta/typesense/manifests.schema.json')) {
  const schema = await Bun.file('./.iiif/build/meta/typesense/manifests.schema.json').json();
  const data = await Bun.file('./.iiif/build/meta/typesense/manifests.jsonl').text();

  const jsonDocuments = data.split('\n').map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find((collection) => collection.name === 'manifests');
  if (manifestsCollection) {
    await client.collections('manifests').delete();
  }

  await client.collections().create(schema);
  await client.collections('manifests').documents().import(jsonDocuments, { action: 'upsert' });

  console.log(`Imported ${jsonDocuments.length} documents into the 'manifests' collection`);
}

if (existsSync('./.iiif/build/meta/typesense/manifest-plaintext.schema.json')) {
  const schema = await Bun.file('./.iiif/build/meta/typesense/manifest-plaintext.schema.json').json();
  const data = await Bun.file('./.iiif/build/meta/typesense/manifest-plaintext.jsonl').text();

  const jsonDocuments = data.split('\n').map((line) => JSON.parse(line));

  const collections = await client.collections().retrieve();
  const manifestsCollection = collections.find((collection) => collection.name === 'manifest-plaintext');
  if (manifestsCollection) {
    await client.collections('manifest-plaintext').delete();
  }

  await client.collections().create(schema);
  await client.collections('manifest-plaintext').documents().import(jsonDocuments, { action: 'upsert' });

  console.log(`Imported ${jsonDocuments.length} documents into the 'manifest-plaintext' collection`);
}
