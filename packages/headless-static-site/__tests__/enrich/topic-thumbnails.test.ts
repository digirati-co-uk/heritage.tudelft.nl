import fs from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { enrichTopicThumbnails } from "../../src/enrich/topic-thumbnails.ts";
import { FileHandler } from "../../src/util/file-handler.ts";

describe("enrichTopicThumbnails", () => {
  let root = "";

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "iiif-hss-topic-thumbs-"));
  });

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true });
      root = "";
    }
  });

  test("writes topic thumbnail metadata when missing", async () => {
    const topicsDir = join(root, "content", "topics");
    const fileHandler = new FileHandler(fs as any, root);

    await enrichTopicThumbnails.collect(
      {
        "manifests/one": {
          topics: {
            date: ["1890"],
          },
          thumbnail: {
            id: "https://example.org/thumb-a.jpg",
            width: 200,
            height: 100,
          },
          dateHint: "2024-01-01",
        },
      } as any,
      {
        build: { topicsDir },
        fileHandler,
      } as any,
      {
        selectionStrategy: "first",
      }
    );

    const output = await readFile(join(topicsDir, "date", "1890.yaml"), "utf-8");
    expect(output).toContain("thumbnail: https://example.org/thumb-a.jpg");
  });

  test("preserves existing topic thumbnail overrides", async () => {
    const topicsDir = join(root, "content", "topics");
    const topicFile = join(topicsDir, "date", "1890.yaml");
    await fs.promises.mkdir(join(topicsDir, "date"), { recursive: true });
    await writeFile(topicFile, "thumbnail: https://example.org/manual.jpg\n", "utf-8");
    const fileHandler = new FileHandler(fs as any, root);

    await enrichTopicThumbnails.collect(
      {
        "manifests/one": {
          topics: {
            date: ["1890"],
          },
          thumbnail: {
            id: "https://example.org/auto.jpg",
            width: 200,
            height: 100,
          },
          dateHint: "2024-01-01",
        },
      } as any,
      {
        build: { topicsDir },
        fileHandler,
      } as any,
      {
        selectionStrategy: "highestRes",
      }
    );

    const output = await readFile(topicFile, "utf-8");
    expect(output).toContain("https://example.org/manual.jpg");
    expect(output).not.toContain("https://example.org/auto.jpg");
  });
});
