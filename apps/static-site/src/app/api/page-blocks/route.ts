import { fileSystemLoader, generateScreenshots } from "@/blocks/server";
import { directory } from "@/components/directory";
import { createNextRequestHandler } from "@page-blocks/next";

export const POST = createNextRequestHandler({
  loader: fileSystemLoader,
  directory,
  generateScreenshots,
});
