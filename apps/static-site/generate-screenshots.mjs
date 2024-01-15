import { createScreenshotGenerator } from "@page-blocks/screenshots";
import { cwd } from "node:process";
import { join } from "node:path";

export const generateScreenshots = createScreenshotGenerator({
  host: "http://localhost:3000",
  target: join(cwd(), "public/blocks"),
  archivePath: "/en/block-archive",
});

generateScreenshots({ force: true }).then(() => {
  console.log('done');
  process.exit();
})
