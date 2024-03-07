import { join } from "node:path";
import { cwd } from "node:process";
import { createFileSystemLoader } from "@page-blocks/file-system";
import { createScreenshotGenerator } from "@page-blocks/screenshots";

export const generateScreenshots = createScreenshotGenerator({
  host: "http://localhost:3000",
  target: join(cwd(), "public/blocks"),
  archivePath: "en/block-archive",
}) as any;

export const fileSystemLoader = createFileSystemLoader({
  path: join(cwd(), "slots"),
  contexts: [
    "locale",
    "publication",
    "exhibition",
    "manifest",
    "page",
    "collection",
    "canvas",
    "article",
  ],
});
