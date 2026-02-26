import { existsSync } from "node:fs";
import { join } from "node:path";
import slug from "slug";
import { stringify } from "yaml";
import type { Enrichment } from "../util/enrich.ts";

export interface TopicThumbnailConfig {
  selectionStrategy?: "first" | "mostRecent" | "highestRes" | "random";
  fallback?: string | null;
}

type ThumbnailCandidate = {
  id: string;
  width?: number;
  height?: number;
};

type ManifestTopicTemp = {
  topics: Record<string, string[]>;
  thumbnail: ThumbnailCandidate | null;
  dateHint: string;
};

function normalizeThumbnail(value: any): ThumbnailCandidate | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return { id: value };
  }
  if (Array.isArray(value) && value.length > 0) {
    return normalizeThumbnail(value[0]);
  }
  const id = value.id || value["@id"];
  if (!id || typeof id !== "string") {
    return null;
  }
  return {
    id,
    width: typeof value.width === "number" ? value.width : undefined,
    height: typeof value.height === "number" ? value.height : undefined,
  };
}

function scoreBySize(candidate: ThumbnailCandidate) {
  return (candidate.width || 0) * (candidate.height || 0);
}

function pickCandidate(strategy: TopicThumbnailConfig["selectionStrategy"], items: ManifestTopicTemp[]) {
  const candidates = items
    .map((item) => item.thumbnail)
    .filter((value): value is ThumbnailCandidate => Boolean(value?.id));
  if (!candidates.length) {
    return null;
  }

  if (strategy === "highestRes") {
    return [...candidates].sort((a, b) => scoreBySize(b) - scoreBySize(a))[0];
  }
  if (strategy === "mostRecent") {
    const sorted = [...items].sort((a, b) => b.dateHint.localeCompare(a.dateHint));
    for (const item of sorted) {
      if (item.thumbnail?.id) {
        return item.thumbnail;
      }
    }
    return null;
  }
  if (strategy === "random") {
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  return candidates[0];
}

export const enrichTopicThumbnails: Enrichment<TopicThumbnailConfig, ManifestTopicTemp> = {
  id: "enrich-topic-thumbnails",
  name: "Enrich topic thumbnails",
  types: ["Manifest"],
  invalidate: async () => true,
  async handler(resource, api) {
    const indices = await api.indices.value;
    const meta = await api.meta.value;

    const topics = Object.fromEntries(
      Object.entries(indices || {}).filter(
        ([topicType, values]) => topicType && Array.isArray(values) && values.length > 0
      )
    ) as Record<string, string[]>;

    if (Object.keys(topics).length === 0) {
      return {};
    }

    const thumbnail = normalizeThumbnail(api.resource?.thumbnail) || normalizeThumbnail(meta?.thumbnail);
    const dateHint = String(
      api.resource?.modified || api.resource?.navDate || meta?.created || meta?.date || api.resource?.id || ""
    );

    return {
      temp: {
        topics,
        thumbnail,
        dateHint,
      },
    };
  },

  async collect(temp, api, config) {
    if (!temp || Object.keys(temp).length === 0) {
      return;
    }

    const strategy = config?.selectionStrategy || "first";
    const grouped: Record<string, Array<{ candidate: ManifestTopicTemp; topicValue: string }>> = {};

    for (const item of Object.values(temp)) {
      const topicTypes = Object.keys(item.topics || {});
      for (const topicType of topicTypes) {
        for (const value of item.topics[topicType] || []) {
          const topicValue = String(value || "").trim();
          if (!topicValue) {
            continue;
          }
          const topicSlug = slug(topicValue);
          if (!topicSlug) {
            continue;
          }
          const key = `${topicType}/${topicSlug}`;
          grouped[key] = grouped[key] || [];
          grouped[key].push({ candidate: item, topicValue });
        }
      }
    }

    for (const [key, entries] of Object.entries(grouped)) {
      const [topicType, topicSlug] = key.split("/");
      const topicPath = join(api.build.topicsDir, topicType, `${topicSlug}.yaml`);
      const candidates = entries.map((entry) => entry.candidate);
      const selected = pickCandidate(strategy, candidates);
      const selectedThumbnail = selected?.id || config?.fallback || null;
      if (!selectedThumbnail) {
        continue;
      }

      const existing = existsSync(topicPath) ? await api.fileHandler.readYaml(topicPath) : {};
      if (existing?.thumbnail) {
        continue;
      }

      const firstTopicValue = entries[0]?.topicValue || topicSlug;
      const topicMeta = {
        id: topicSlug,
        label: firstTopicValue,
        slug: `topics/${topicType}/${topicSlug}`,
        ...existing,
        thumbnail: selectedThumbnail,
      };

      await api.fileHandler.writeFile(topicPath, stringify(topicMeta));
    }
  },
};
