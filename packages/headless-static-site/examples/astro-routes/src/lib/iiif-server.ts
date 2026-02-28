import { createIiifAstroServer } from "iiif-hss/astro/server";
import { iiifRoutes } from "./iiif-routes";

export const iiif = createIiifAstroServer({ routes: iiifRoutes });
