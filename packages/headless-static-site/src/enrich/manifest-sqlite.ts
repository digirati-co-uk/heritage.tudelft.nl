import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import slug from "slug";
import { type Database, open } from "sqlite";
import sqlite3 from "sqlite3";
import { getValue } from "../extract/extract-label-string.ts";
import type { Enrichment } from "../util/enrich.ts";

export const manifestSqlite: Enrichment<{
  db: Database<sqlite3.Database, sqlite3.Statement>;
  enableTopics?: boolean;
}> = {
  name: "sqlite",
  id: "manifest-sqlite",
  types: ["Manifest"],
  configure: async (api, config = {}) => {
    await mkdir(api.build.filesDir, { recursive: true });
    const dbFile = join(api.build.filesDir, "meta", "manifests.db");
    const db = await open({
      filename: dbFile,
      driver: sqlite3.Database,
    });

    await db.exec(
      `
      CREATE TABLE IF NOT EXISTS manifests (
        id TEXT PRIMARY KEY,
        label TEXT,
        slug TEXT,
        thumbnail TEXT
      )
    `
    );

    if (config.enableTopics) {
      await db.exec(
        `
            CREATE TABLE IF NOT EXISTS topics
            (
                id         TEXT PRIMARY KEY,
                topic      TEXT,
                topic_type TEXT,
                label      TEXT,
                slug       TEXT
            )
        `
      );

      await db.exec(
        `
            CREATE TABLE IF NOT EXISTS topics_manifests
            (
                topic_id    TEXT,
                manifest_id TEXT,
                PRIMARY KEY (topic_id, manifest_id)
            )
        `
      );
    }
    return {
      db,
      ...config,
    };
  },
  invalidate: async () => {
    return true;
  },
  handler: async (resource, api, config) => {
    if (api.resource) {
      const meta = await api.meta.value;
      const current = resource.vault?.get(api.resource);
      const value = current ? getValue(current.label) : null;
      if (value) {
        await config.db.run(
          `
            INSERT INTO manifests (id, slug, label, thumbnail)
            VALUES (:id, :slug, :name, :thumbnail)
            ON CONFLICT (id) DO UPDATE SET label = :name,
                                           slug = :slug,
                                           thumbnail = :thumbnail
          `,
          {
            ":id": resource.id,
            ":name": value,
            ":slug": resource.slug,
            ":thumbnail": meta.thumbnail?.id || "",
          }
        );
      }

      if (config.enableTopics) {
        const indices = await api.indices.value;
        const topicTypes = Object.keys(indices);
        for (const topicTypeKey of topicTypes) {
          const topicType = indices[topicTypeKey];
          for (const topic of topicType) {
            const topicId = slug(topic);
            const topicLabel = topic;

            await config.db.run(
              `
                    INSERT INTO topics (id, topic, topic_type, label, slug)
                    VALUES (:id, :topic, :topic_type, :label, :slug)
                    ON CONFLICT (id) DO NOTHING
                `,
              {
                ":id": `${topicTypeKey}/${topicId}`,
                ":topic": topic,
                ":topic_type": topicTypeKey,
                ":label": topicLabel,
                ":slug": `topics/${topicTypeKey}/${topicId}`,
              }
            );

            await config.db.run(
              `
                    INSERT INTO topics_manifests (topic_id, manifest_id)
                    VALUES (:topic_id, :manifest_id)
                    ON CONFLICT (topic_id, manifest_id) DO NOTHING
                `,
              {
                ":topic_id": `${topicTypeKey}/${topicId}`,
                ":manifest_id": resource.id,
              }
            );
          }
        }
      }
    }

    return {};
  },
  close: async (config) => {
    config.db.close();
  },
};
