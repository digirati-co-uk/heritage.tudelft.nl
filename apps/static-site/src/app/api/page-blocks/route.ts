import { createNextRequestHandler } from "@page-blocks/next";
import { fileSystemLoader, generateScreenshots } from "@/blocks/server";
import { directory } from "@/components/directory";

export const POST = createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
  generateScreenshots,
});
