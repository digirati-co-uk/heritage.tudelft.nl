import { env } from "node:process";
export * from "./.iiifrc-base.yml";

const url = env["IIIF_PREVIEW_URL"] || env["IIIF_URL"] || "http://localhost:3000";

export const server = {
  url,
};
